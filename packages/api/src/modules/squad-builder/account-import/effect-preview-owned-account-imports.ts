import * as ClockRuntime from "effect/Clock";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import { parseAccountDisplayName } from "../account-display-name.js";
import type { AccountDisplayName } from "../account-display-name.js";
import type { AppUserId } from "../app-user-id.js";
import type { MargonemProfileId } from "../margonem-profile-id.js";
import { profileIdToNumber } from "../margonem-profile-id.js";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../margonem-profile-url.js";
import { isError, isOk } from "../result.js";
import type {
  DuplicateMargonemAccountError,
  ProfileAccessState,
} from "./account-import-store.js";
import { EffectAccountImportStore } from "./effect-account-import-store.js";
import { EffectPreviewMargonemProfileImport } from "./effect-preview-margonem-profile-import.js";
import type {
  PreviewMargonemProfileImportError,
  PreviewMargonemProfileImportInput,
  PreviewMargonemProfileImportOutput,
} from "./preview-margonem-profile-import.js";
import {
  DuplicateProfileInBatchError,
  EmptyProfileUrlBatch,
  TooManyProfileUrlsInBatch,
} from "./preview-owned-account-imports.js";
import type {
  PreviewOwnedAccountImportItem,
  PreviewOwnedAccountImportLineError,
  PreviewOwnedAccountImportsInput,
} from "./preview-owned-account-imports.js";

const batchImportPolicy = {
  fetchConcurrency: 2,
  maxProfileUrls: 20,
} as const;

const pendingImportPolicy = {
  expiresAfterMinutes: 30,
} as const;

interface ParsedLine {
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly profileId: MargonemProfileId;
}

interface LineFailure {
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly error: PreviewOwnedAccountImportLineError;
}

/** Effect seam over the single-profile preview service for batch use. */
export interface EffectSingleMargonemProfilePreview {
  readonly preview: (
    input: PreviewMargonemProfileImportInput,
    options?: { readonly signal?: AbortSignal }
  ) => Effect<
    PreviewMargonemProfileImportOutput,
    PreviewMargonemProfileImportError,
    EffectAccountImportStore
  >;
}

const isEmpty = (value: string): boolean => value.trim().length === 0;

const defaultDisplayNameFor = (
  suggestedAccountName: string,
  profileId: MargonemProfileId
): AccountDisplayName => {
  const parsed = parseAccountDisplayName(suggestedAccountName);

  if (isOk(parsed)) {
    return parsed.value;
  }

  const fallback = parseAccountDisplayName(
    `Profil ${profileIdToNumber(profileId)}`
  );

  // SAFETY: the fallback template always produces a valid display name.
  return isOk(fallback)
    ? fallback.value
    : (suggestedAccountName as AccountDisplayName);
};

const accessStateToLineError = (
  state: ProfileAccessState
): DuplicateMargonemAccountError | undefined => {
  switch (state._tag) {
    case "Available": {
      return undefined;
    }
    case "OwnedByActor": {
      return { _tag: "MargonemAccountAlreadyOwnedByActor" };
    }
    case "OwnedByAnotherUser": {
      return { _tag: "MargonemAccountOwnedByAnotherUser" };
    }
    case "SharedWithActor": {
      return { _tag: "MargonemAccountAlreadySharedWithActor" };
    }
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
};

const toFailedItem = (failure: LineFailure): PreviewOwnedAccountImportItem => ({
  _tag: "PreviewFailed",
  error: failure.error,
  inputUrl: failure.inputUrl,
  lineNumber: failure.lineNumber,
});

const persistPendingImport = ({
  actorUserId,
  inputUrl,
  lineNumber,
  now,
  preview,
}: {
  readonly actorUserId: AppUserId;
  readonly inputUrl: string;
  readonly lineNumber: number;
  readonly now: Date;
  readonly preview: PreviewMargonemProfileImportOutput;
}): Effect<
  { readonly lineNumber: number; readonly item: PreviewOwnedAccountImportItem },
  never,
  EffectAccountImportStore
> => {
  const expiresAt = new Date(
    now.getTime() + pendingImportPolicy.expiresAfterMinutes * 60_000
  );
  const defaultDisplayName = defaultDisplayNameFor(
    preview.suggestedAccountName,
    preview.profileId
  );

  return EffectAccountImportStore.use((store) =>
    store.createPendingImport({
      actorUserId,
      defaultDisplayName,
      expiresAt,
      fetchedAt: preview.lastFetchedAt,
      firecrawlCreditsUsed: preview.firecrawlCreditsUsed,
      generatedProfileUrl: toMargonemProfileUrl(preview.profileId),
      jarunaCharacters: preview.jarunaCharacters,
      profileId: preview.profileId,
      suggestedAccountName: preview.suggestedAccountName,
    })
  ).pipe(
    EffectRuntime.match({
      onFailure: (error) => ({
        item: toFailedItem({ error, inputUrl, lineNumber }),
        lineNumber,
      }),
      onSuccess: (created) => ({
        item: {
          _tag: "PreviewSucceeded" as const,
          defaultDisplayName,
          firecrawlCreditsUsed: preview.firecrawlCreditsUsed,
          generatedProfileUrl: toMargonemProfileUrl(preview.profileId),
          inputUrl,
          jarunaCharacters: preview.jarunaCharacters,
          lastFetchedAt: preview.lastFetchedAt,
          lineNumber,
          pendingImportId: created.id,
          profileId: preview.profileId,
          suggestedAccountName: preview.suggestedAccountName,
        },
        lineNumber,
      }),
    })
  );
};

/** Effect service module that previews and persists pending owned-account imports. */
export class EffectPreviewOwnedAccountImports {
  readonly serviceName = "EffectPreviewOwnedAccountImports";

  /** Preview and persist pending imports for a batch of pasted profile URLs. */
  readonly preview = EffectRuntime.fn("AccountImport.previewBatch")(
    function* previewBatchEffect(
      input: PreviewOwnedAccountImportsInput,
      options: { readonly signal?: AbortSignal } = {}
    ) {
      const singlePreview = new EffectPreviewMargonemProfileImport();

      const currentTimeMillis = yield* ClockRuntime.currentTimeMillis;
      const now = new Date(currentTimeMillis);
      const nonBlankLines = input.profileUrls
        .map((url, index) => ({ inputUrl: url, lineNumber: index + 1 }))
        .filter((line) => !isEmpty(line.inputUrl));

      if (nonBlankLines.length === 0) {
        return yield* new EmptyProfileUrlBatch();
      }

      if (nonBlankLines.length > batchImportPolicy.maxProfileUrls) {
        return yield* new TooManyProfileUrlsInBatch({
          maxUrls: batchImportPolicy.maxProfileUrls,
        });
      }

      const failures: LineFailure[] = [];
      const parsedLines: ParsedLine[] = [];
      const firstLineForProfileId = new Map<number, number>();

      for (const line of nonBlankLines) {
        const parsedProfileId = parseMargonemProfileUrl(line.inputUrl);

        if (isError(parsedProfileId)) {
          failures.push({
            error: parsedProfileId.error,
            inputUrl: line.inputUrl,
            lineNumber: line.lineNumber,
          });
          continue;
        }

        const profileIdNumber = profileIdToNumber(parsedProfileId.value);
        const firstLineNumber = firstLineForProfileId.get(profileIdNumber);

        if (firstLineNumber !== undefined) {
          failures.push({
            error: new DuplicateProfileInBatchError({
              firstLineNumber,
            }),
            inputUrl: line.inputUrl,
            lineNumber: line.lineNumber,
          });
          continue;
        }

        firstLineForProfileId.set(profileIdNumber, line.lineNumber);
        parsedLines.push({
          inputUrl: line.inputUrl,
          lineNumber: line.lineNumber,
          profileId: parsedProfileId.value,
        });
      }

      const accessResults = yield* EffectRuntime.all(
        parsedLines.map((line) =>
          EffectAccountImportStore.use((store) =>
            store.findProfileAccessState({
              actorUserId: input.actorUserId,
              profileId: line.profileId,
            })
          ).pipe(
            EffectRuntime.match({
              onFailure: (error) => ({
                _tag: "LineFailure" as const,
                error,
                inputUrl: line.inputUrl,
                lineNumber: line.lineNumber,
              }),
              onSuccess: (state) => ({
                _tag: "AccessState" as const,
                inputUrl: line.inputUrl,
                lineNumber: line.lineNumber,
                profileId: line.profileId,
                state,
              }),
            })
          )
        )
      );

      const availableLines: ParsedLine[] = [];

      for (const result of accessResults) {
        if (result._tag === "LineFailure") {
          failures.push({
            error: result.error,
            inputUrl: result.inputUrl,
            lineNumber: result.lineNumber,
          });
          continue;
        }

        const lineError = accessStateToLineError(result.state);

        if (lineError !== undefined) {
          failures.push({
            error: lineError,
            inputUrl: result.inputUrl,
            lineNumber: result.lineNumber,
          });
          continue;
        }

        availableLines.push({
          inputUrl: result.inputUrl,
          lineNumber: result.lineNumber,
          profileId: result.profileId,
        });
      }

      const fetchedItems = yield* EffectRuntime.all(
        availableLines.map((line) =>
          singlePreview
            .preview(
              {
                actorUserId: input.actorUserId,
                profileUrl: line.inputUrl,
              },
              options.signal === undefined ? {} : { signal: options.signal }
            )
            .pipe(
              EffectRuntime.matchEffect({
                onFailure: (error) =>
                  EffectRuntime.succeed({
                    item: toFailedItem({
                      error,
                      inputUrl: line.inputUrl,
                      lineNumber: line.lineNumber,
                    }),
                    lineNumber: line.lineNumber,
                  }),
                onSuccess: (preview) =>
                  persistPendingImport({
                    actorUserId: input.actorUserId,
                    inputUrl: line.inputUrl,
                    lineNumber: line.lineNumber,
                    now,
                    preview,
                  }),
              })
            )
        ),
        { concurrency: batchImportPolicy.fetchConcurrency }
      );

      const itemsByLine = new Map<number, PreviewOwnedAccountImportItem>();

      for (const failure of failures) {
        itemsByLine.set(failure.lineNumber, toFailedItem(failure));
      }

      for (const result of fetchedItems) {
        itemsByLine.set(result.lineNumber, result.item);
      }

      const items = nonBlankLines
        .map((line) => itemsByLine.get(line.lineNumber))
        .filter(
          (item): item is PreviewOwnedAccountImportItem => item !== undefined
        );

      return { items };
    }
  );
}

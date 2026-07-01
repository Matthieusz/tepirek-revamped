import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import { parseAccountDisplayName } from "../account-display-name";
import type { AccountDisplayName } from "../account-display-name";
import type { AppUserId } from "../app-user-id";
import type { MargonemProfileId } from "../margonem-profile-id";
import { profileIdToNumber } from "../margonem-profile-id";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../margonem-profile-url";
import { isError, isOk } from "../result";
import { EffectSquadGroupStore } from "../squad-groups/squad-group-store";
import type {
  DuplicateMargonemAccountError,
  ProfileAccessState,
} from "./account-import-store";
import type {
  Clock,
  PreviewMargonemProfileImportError,
  PreviewMargonemProfileImportInput,
  PreviewMargonemProfileImportOutput,
} from "./preview-margonem-profile-import";
import type {
  PreviewOwnedAccountImportItem,
  PreviewOwnedAccountImportLineError,
  PreviewOwnedAccountImportsError,
  PreviewOwnedAccountImportsInput,
  PreviewOwnedAccountImportsOutput,
} from "./preview-owned-account-imports";

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
    EffectSquadGroupStore
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
  clock,
  inputUrl,
  lineNumber,
  preview,
}: {
  readonly actorUserId: AppUserId;
  readonly clock: Clock;
  readonly inputUrl: string;
  readonly lineNumber: number;
  readonly preview: PreviewMargonemProfileImportOutput;
}): Effect<
  { readonly lineNumber: number; readonly item: PreviewOwnedAccountImportItem },
  never,
  EffectSquadGroupStore
> => {
  const now = clock.now();
  const expiresAt = new Date(
    now.getTime() + pendingImportPolicy.expiresAfterMinutes * 60_000
  );
  const defaultDisplayName = defaultDisplayNameFor(
    preview.suggestedAccountName,
    preview.profileId
  );

  return EffectSquadGroupStore.use((store) =>
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
  private readonly singlePreview: EffectSingleMargonemProfilePreview;
  private readonly clock: Clock;

  constructor(singlePreview: EffectSingleMargonemProfilePreview, clock: Clock) {
    this.singlePreview = singlePreview;
    this.clock = clock;
  }

  /** Preview and persist pending imports for a batch of pasted profile URLs. */
  preview(
    input: PreviewOwnedAccountImportsInput,
    options: { readonly signal?: AbortSignal } = {}
  ): Effect<
    PreviewOwnedAccountImportsOutput,
    PreviewOwnedAccountImportsError,
    EffectSquadGroupStore
  > {
    const { clock, singlePreview } = this;

    return EffectRuntime.gen(function* previewBatchEffect() {
      const nonBlankLines = input.profileUrls
        .map((url, index) => ({ inputUrl: url, lineNumber: index + 1 }))
        .filter((line) => !isEmpty(line.inputUrl));

      if (nonBlankLines.length === 0) {
        return yield* EffectRuntime.fail({
          _tag: "EmptyProfileUrlBatch" as const,
        });
      }

      if (nonBlankLines.length > batchImportPolicy.maxProfileUrls) {
        return yield* EffectRuntime.fail({
          _tag: "TooManyProfileUrlsInBatch" as const,
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
            error: {
              _tag: "DuplicateProfileInBatch",
              firstLineNumber,
            },
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
          EffectSquadGroupStore.use((store) =>
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
              { signal: options.signal }
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
                    clock,
                    inputUrl: line.inputUrl,
                    lineNumber: line.lineNumber,
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
    });
  }
}

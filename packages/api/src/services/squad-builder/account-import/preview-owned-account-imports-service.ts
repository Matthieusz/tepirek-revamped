import * as ClockRuntime from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.ts";
import type { ParseMargonemProfileHtmlError } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { profileIdToNumber } from "../../../domain/squad-builder/margonem-profile-id.ts";
import type { ParseMargonemProfileUrlError } from "../../../domain/squad-builder/margonem-profile-url.ts";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../../../domain/squad-builder/margonem-profile-url.ts";
import type { PendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import { FirecrawlClientService } from "../firecrawl-client.ts";
import type { FirecrawlScrapeError } from "../firecrawl-client.ts";
import { FirecrawlConfigService } from "../firecrawl-config.ts";
import type { FirecrawlCreditCount } from "../firecrawl-config.ts";
import { logSquadBuilderInternalFailure } from "../internal-error-logging.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
import type {
  DuplicateMargonemAccountError,
  FirecrawlBudgetError,
  ProfileAccessState,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.ts";
import { preview as previewMargonemProfileImport } from "./preview-margonem-profile-import-service.ts";
import type {
  PreviewMargonemProfileImportError,
  PreviewMargonemProfileImportInput,
  PreviewMargonemProfileImportOutput,
} from "./preview-margonem-profile-import-service.ts";

export interface PreviewOwnedAccountImportsInput {
  readonly actorUserId: AppUserId;
  readonly profileUrls: readonly string[];
}

export interface PreviewOwnedAccountImportSuccess {
  readonly _tag: "PreviewSucceeded";
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly suggestedAccountName: string;
  readonly defaultDisplayName: AccountDisplayName;
  readonly lastFetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

export class DuplicateProfileInBatchError extends Schema.TaggedErrorClass<DuplicateProfileInBatchError>()(
  "DuplicateProfileInBatch",
  { firstLineNumber: Schema.Number },
  {}
) {}

export type PreviewOwnedAccountImportLineError =
  | ParseMargonemProfileUrlError
  | DuplicateProfileInBatchError
  | DuplicateMargonemAccountError
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

export interface PreviewOwnedAccountImportFailure {
  readonly _tag: "PreviewFailed";
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly error: PreviewOwnedAccountImportLineError;
}

export type PreviewOwnedAccountImportItem =
  | PreviewOwnedAccountImportSuccess
  | PreviewOwnedAccountImportFailure;

export interface PreviewOwnedAccountImportsOutput {
  readonly items: readonly PreviewOwnedAccountImportItem[];
}

// oxlint-disable-next-line max-classes-per-file -- Batch policy errors live with the use case.
export class TooManyProfileUrlsInBatch extends Schema.TaggedErrorClass<TooManyProfileUrlsInBatch>()(
  "TooManyProfileUrlsInBatch",
  { maxUrls: Schema.Number },
  {}
) {}

// oxlint-disable-next-line max-classes-per-file -- Batch policy errors live with the use case.
export class EmptyProfileUrlBatch extends Schema.TaggedErrorClass<EmptyProfileUrlBatch>()(
  "EmptyProfileUrlBatch",
  {},
  {}
) {}

export type PreviewOwnedAccountImportsError =
  | TooManyProfileUrlsInBatch
  | EmptyProfileUrlBatch
  | SquadBuilderPersistenceUnavailable;

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
    input: PreviewMargonemProfileImportInput
  ) => Effect<
    PreviewMargonemProfileImportOutput,
    PreviewMargonemProfileImportError,
    AccountImportStoreService
  >;
}

const isEmpty = (value: string): boolean => value.trim().length === 0;

const defaultDisplayNameFor = (
  suggestedAccountName: string,
  profileId: MargonemProfileId
): AccountDisplayName => {
  const parsed = EffectRuntime.runSyncExit(
    parseAccountDisplayName(suggestedAccountName)
  );

  if (parsed._tag === "Success") {
    return parsed.value;
  }

  const fallback = EffectRuntime.runSyncExit(
    parseAccountDisplayName(`Profil ${profileIdToNumber(profileId)}`)
  );

  if (fallback._tag === "Success") {
    return fallback.value;
  }

  throw new Error("Generated profile display name violated its invariant");
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

const toFailedItem = (
  lineFailure: LineFailure
): PreviewOwnedAccountImportItem => ({
  _tag: "PreviewFailed",
  error: lineFailure.error,
  inputUrl: lineFailure.inputUrl,
  lineNumber: lineFailure.lineNumber,
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
  AccountImportStoreService
> => {
  const expiresAt = new Date(
    now.getTime() + pendingImportPolicy.expiresAfterMinutes * 60_000
  );
  const defaultDisplayName = defaultDisplayNameFor(
    preview.suggestedAccountName,
    preview.profileId
  );

  return AccountImportStoreService.use((store) =>
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
    EffectRuntime.matchEffect({
      onFailure: (error) =>
        logSquadBuilderInternalFailure(error).pipe(
          EffectRuntime.as({
            item: toFailedItem({ error, inputUrl, lineNumber }),
            lineNumber,
          })
        ),
      onSuccess: (created) =>
        EffectRuntime.succeed({
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

/** Preview and persist pending imports for a batch of pasted profile URLs. */
export const preview = EffectRuntime.fn("AccountImport.previewBatch")(
  function* previewBatchEffect(input: PreviewOwnedAccountImportsInput) {
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
      const parsedProfileId = yield* EffectRuntime.match(
        parseMargonemProfileUrl(line.inputUrl),
        {
          onFailure: (error) => {
            failures.push({
              error,
              inputUrl: line.inputUrl,
              lineNumber: line.lineNumber,
            });
            return null;
          },
          onSuccess: (value) => value,
        }
      );

      if (parsedProfileId === null) {
        continue;
      }

      const profileIdNumber = profileIdToNumber(parsedProfileId);
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
        profileId: parsedProfileId,
      });
    }

    const accessResults = yield* EffectRuntime.all(
      parsedLines.map((line) =>
        AccountImportStoreService.use((store) =>
          store.findProfileAccessState({
            actorUserId: input.actorUserId,
            profileId: line.profileId,
          })
        ).pipe(
          EffectRuntime.matchEffect({
            onFailure: (error) =>
              logSquadBuilderInternalFailure(error).pipe(
                EffectRuntime.as({
                  _tag: "LineFailure" as const,
                  error,
                  inputUrl: line.inputUrl,
                  lineNumber: line.lineNumber,
                })
              ),
            onSuccess: (state) =>
              EffectRuntime.succeed({
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
        previewMargonemProfileImport({
          actorUserId: input.actorUserId,
          profileUrl: line.inputUrl,
        }).pipe(
          EffectRuntime.matchEffect({
            onFailure: (error) =>
              logSquadBuilderInternalFailure(error).pipe(
                EffectRuntime.as({
                  item: toFailedItem({
                    error,
                    inputUrl: line.inputUrl,
                    lineNumber: line.lineNumber,
                  }),
                  lineNumber: line.lineNumber,
                })
              ),
            onSuccess: (profilePreview) =>
              persistPendingImport({
                actorUserId: input.actorUserId,
                inputUrl: line.inputUrl,
                lineNumber: line.lineNumber,
                now,
                preview: profilePreview,
              }),
          })
        )
      ),
      { concurrency: batchImportPolicy.fetchConcurrency }
    );

    const itemsByLine = new Map<number, PreviewOwnedAccountImportItem>();

    for (const lineFailure of failures) {
      itemsByLine.set(lineFailure.lineNumber, toFailedItem(lineFailure));
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

const makePreview = (
  store: typeof AccountImportStoreService.Service,
  config: typeof FirecrawlConfigService.Service,
  firecrawl: typeof FirecrawlClientService.Service
) =>
  EffectRuntime.fn("AccountImport.previewBatch")(
    (input: PreviewOwnedAccountImportsInput) =>
      preview(input).pipe(
        EffectRuntime.provideService(AccountImportStoreService, store),
        EffectRuntime.provideService(FirecrawlConfigService, config),
        EffectRuntime.provideService(FirecrawlClientService, firecrawl)
      )
  );

export interface PreviewOwnedAccountImports {
  readonly preview: ReturnType<typeof makePreview>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class PreviewOwnedAccountImportsService extends Context.Service<
  PreviewOwnedAccountImportsService,
  PreviewOwnedAccountImports
>()("@tepirek-revamped/api/squad-builder/PreviewOwnedAccountImportsService") {}

export const layer = Layer.effect(
  PreviewOwnedAccountImportsService,
  EffectRuntime.gen(function* layer() {
    const store = yield* AccountImportStoreService;
    const config = yield* FirecrawlConfigService;
    const firecrawl = yield* FirecrawlClientService;
    return { preview: makePreview(store, config, firecrawl) };
  })
);

import * as Arr from "effect/Array";
import * as Data from "effect/Data";
import * as DateTime from "effect/DateTime";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.ts";
import type { ParseMargonemProfileHtmlError } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import type { ParseMargonemProfileUrlError } from "../../../domain/squad-builder/margonem-profile-url.ts";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../../../domain/squad-builder/margonem-profile-url.ts";
import type { PendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import type { FirecrawlScrapeError } from "../firecrawl-client.ts";
import type { FirecrawlCreditCount } from "../firecrawl-config.ts";
import type { FirecrawlBudgetError } from "../firecrawl-request-accounting-store.ts";
import {
  MargonemAccountAlreadyOwnedByActor,
  MargonemAccountAlreadySharedWithActor,
  MargonemAccountOwnedByAnotherUser,
} from "../squad-groups/squad-group-errors.ts";
import type { SquadBuilderPersistenceUnavailable } from "../squad-groups/squad-group-errors.ts";
import {
  AccountImportStoreService,
  ProfileAccessState,
} from "./account-import-store.ts";
import type { DuplicateMargonemAccountError } from "./account-import-store.ts";
import { preview as previewMargonemProfileImport } from "./preview-margonem-profile-import-service.ts";
import type { PreviewMargonemProfileImportOutput } from "./preview-margonem-profile-import-service.ts";

export interface PreviewOwnedAccountImportsInput {
  readonly actorUserId: AppUserId;
  readonly profileUrls: readonly string[];
}

export type PreviewOwnedAccountImportItem = Data.TaggedEnum<{
  readonly PreviewSucceeded: {
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
  };
  readonly PreviewFailed: {
    readonly lineNumber: number;
    readonly inputUrl: string;
    readonly error: PreviewOwnedAccountImportLineError;
  };
}>;
export const PreviewOwnedAccountImportItem =
  Data.taggedEnum<PreviewOwnedAccountImportItem>();
class DuplicateProfileInBatchError extends Schema.TaggedErrorClass<DuplicateProfileInBatchError>()(
  "DuplicateProfileInBatch",
  { firstLineNumber: Schema.Finite },
  {}
) {}

type PreviewOwnedAccountImportLineError =
  | ParseMargonemProfileUrlError
  | DuplicateProfileInBatchError
  | DuplicateMargonemAccountError
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

// oxlint-disable-next-line max-classes-per-file -- Batch policy errors live with the use case.
class TooManyProfileUrlsInBatch extends Schema.TaggedErrorClass<TooManyProfileUrlsInBatch>()(
  "TooManyProfileUrlsInBatch",
  { maxUrls: Schema.Finite },
  {}
) {}

// oxlint-disable-next-line max-classes-per-file -- Batch policy errors live with the use case.
class EmptyProfileUrlBatch extends Schema.TaggedErrorClass<EmptyProfileUrlBatch>()(
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

const isEmpty = (value: string): boolean => Str.isEmpty(Str.trim(value));

const defaultDisplayNameFor = (
  suggestedAccountName: string,
  profileId: MargonemProfileId
): Effect<AccountDisplayName> =>
  parseAccountDisplayName(suggestedAccountName).pipe(
    EffectRuntime.matchEffect({
      onFailure: () =>
        parseAccountDisplayName(`Profil ${profileId}`).pipe(
          EffectRuntime.mapError(
            () =>
              new Error(
                "Generated fallback profile display name violated the AccountDisplayName invariant"
              )
          ),
          EffectRuntime.orDie
        ),
      onSuccess: EffectRuntime.succeed,
    })
  );

const accessStateToLineError = (
  state: ProfileAccessState
): DuplicateMargonemAccountError | undefined =>
  ProfileAccessState.$match(state, {
    Available: () =>
      Option.none<DuplicateMargonemAccountError>().pipe(Option.getOrUndefined),
    OwnedByActor: () => new MargonemAccountAlreadyOwnedByActor(),
    OwnedByAnotherUser: () => new MargonemAccountOwnedByAnotherUser(),
    SharedWithActor: () => new MargonemAccountAlreadySharedWithActor(),
  });

const toFailedItem = (
  lineFailure: LineFailure
): PreviewOwnedAccountImportItem =>
  PreviewOwnedAccountImportItem.PreviewFailed({
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
  store,
}: {
  readonly actorUserId: AppUserId;
  readonly inputUrl: string;
  readonly lineNumber: number;
  readonly now: Date;
  readonly preview: PreviewMargonemProfileImportOutput;
  readonly store: typeof AccountImportStoreService.Service;
}): Effect<
  { readonly lineNumber: number; readonly item: PreviewOwnedAccountImportItem },
  never,
  never
> =>
  EffectRuntime.gen(function* persistPendingImportEffect() {
    const expiresAt = DateTime.fromDateUnsafe(now).pipe(
      DateTime.add({ minutes: pendingImportPolicy.expiresAfterMinutes }),
      DateTime.toDate
    );
    const defaultDisplayName = yield* defaultDisplayNameFor(
      preview.suggestedAccountName,
      preview.profileId
    );

    return yield* store
      .createPendingImport({
        actorUserId,
        expiresAt,
        fetchedAt: preview.lastFetchedAt,
        jarunaCharacters: preview.jarunaCharacters,
        profileId: preview.profileId,
      })
      .pipe(
        EffectRuntime.matchEffect({
          onFailure: (error) =>
            EffectRuntime.succeed({
              item: toFailedItem({ error, inputUrl, lineNumber }),
              lineNumber,
            }),
          onSuccess: (created) =>
            EffectRuntime.succeed({
              item: PreviewOwnedAccountImportItem.PreviewSucceeded({
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
              }),
              lineNumber,
            }),
        })
      );
  });

/** Preview and persist pending imports for a batch of pasted profile URLs. */
export const preview = EffectRuntime.fn("AccountImport.previewBatch")(
  function* previewBatchEffect(input: PreviewOwnedAccountImportsInput) {
    const store = yield* AccountImportStoreService;
    const now = yield* DateTime.nowAsDate;
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
    let firstLineForProfileId = HashMap.empty<number, number>();

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

      const profileIdNumber = parsedProfileId;
      const firstLineNumber = HashMap.get(
        firstLineForProfileId,
        profileIdNumber
      );

      if (Option.isSome(firstLineNumber)) {
        failures.push({
          error: new DuplicateProfileInBatchError({
            firstLineNumber: firstLineNumber.value,
          }),
          inputUrl: line.inputUrl,
          lineNumber: line.lineNumber,
        });
        continue;
      }

      firstLineForProfileId = HashMap.set(
        firstLineForProfileId,
        profileIdNumber,
        line.lineNumber
      );
      parsedLines.push({
        inputUrl: line.inputUrl,
        lineNumber: line.lineNumber,
        profileId: parsedProfileId,
      });
    }

    const accessResults = yield* EffectRuntime.all(
      parsedLines.map((line) =>
        store
          .findProfileAccessState({
            actorUserId: input.actorUserId,
            profileId: line.profileId,
          })
          .pipe(
            EffectRuntime.matchEffect({
              onFailure: (error) =>
                EffectRuntime.succeed({
                  _tag: "LineFailure" as const,
                  error,
                  inputUrl: line.inputUrl,
                  lineNumber: line.lineNumber,
                }),
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
              EffectRuntime.succeed({
                item: toFailedItem({
                  error,
                  inputUrl: line.inputUrl,
                  lineNumber: line.lineNumber,
                }),
                lineNumber: line.lineNumber,
              }),
            onSuccess: (profilePreview) =>
              persistPendingImport({
                actorUserId: input.actorUserId,
                inputUrl: line.inputUrl,
                lineNumber: line.lineNumber,
                now,
                preview: profilePreview,
                store,
              }),
          })
        )
      ),
      { concurrency: batchImportPolicy.fetchConcurrency }
    );

    let itemsByLine = HashMap.empty<number, PreviewOwnedAccountImportItem>();

    for (const lineFailure of failures) {
      itemsByLine = HashMap.set(
        itemsByLine,
        lineFailure.lineNumber,
        toFailedItem(lineFailure)
      );
    }

    for (const result of fetchedItems) {
      itemsByLine = HashMap.set(itemsByLine, result.lineNumber, result.item);
    }

    const items = Arr.getSomes(
      nonBlankLines.map((line) => HashMap.get(itemsByLine, line.lineNumber))
    );

    return { items };
  }
);

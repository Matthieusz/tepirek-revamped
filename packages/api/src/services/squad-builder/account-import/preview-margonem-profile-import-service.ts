import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { firecrawlYearMonthFromDate } from "../../../domain/squad-builder/firecrawl-year-month.ts";
import type { MargonemCharacterPreview } from "../../../domain/squad-builder/margonem-character.ts";
import { parseMargonemProfileHtml } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import type { ParseMargonemProfileHtmlError } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "../../../domain/squad-builder/margonem-profile-url.ts";
import type { ParseMargonemProfileUrlError } from "../../../domain/squad-builder/margonem-profile-url.ts";
import {
  FirecrawlClientService,
  FirecrawlResponseNotParseable,
} from "../firecrawl-client.ts";
import type { FirecrawlScrapeError } from "../firecrawl-client.ts";
import {
  FirecrawlConfigService,
  parseFirecrawlCreditCount,
} from "../firecrawl-config.ts";
import type { FirecrawlCreditCount } from "../firecrawl-config.ts";
import { FirecrawlRequestAccountingStoreService } from "../firecrawl-request-accounting-store.ts";
import {
  MargonemAccountAlreadyOwnedByActor,
  MargonemAccountAlreadySharedWithActor,
  MargonemAccountOwnedByAnotherUser,
} from "../squad-groups/squad-group-errors.ts";
import { AccountImportStoreService } from "./account-import-store.ts";
import type {
  DuplicateMargonemAccountError,
  FirecrawlBudgetError,
  ProfileAccessState,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.ts";

/** Input for previewing a Margonem profile import. */
export interface PreviewMargonemProfileImportInput {
  readonly actorUserId: AppUserId;
  readonly profileUrl: string;
}

/** Output returned before import confirmation. */
export interface PreviewMargonemProfileImportOutput {
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly suggestedAccountName: string;
  readonly lastFetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Expected failures returned by the profile import preview service. */
export type PreviewMargonemProfileImportError =
  | ParseMargonemProfileUrlError
  | DuplicateMargonemAccountError
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

const profileAccessStateToDuplicateError = (
  state: ProfileAccessState
): DuplicateMargonemAccountError | undefined => {
  switch (state._tag) {
    case "Available": {
      return undefined;
    }
    case "OwnedByActor": {
      return new MargonemAccountAlreadyOwnedByActor();
    }
    case "OwnedByAnotherUser": {
      return new MargonemAccountOwnedByAnotherUser();
    }
    case "SharedWithActor": {
      return new MargonemAccountAlreadySharedWithActor();
    }
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
};

const currentDate = DateTime.nowAsDate;

/** Preview a Margonem profile import without saving the account. */
export const preview = EffectRuntime.fn("AccountImport.previewProfile")(
  function* previewEffect(input: PreviewMargonemProfileImportInput) {
    const store = yield* AccountImportStoreService;
    const requestAccounting = yield* FirecrawlRequestAccountingStoreService;
    const config = yield* FirecrawlConfigService;
    const firecrawl = yield* FirecrawlClientService;
    const profileId = yield* parseMargonemProfileUrl(input.profileUrl);
    const accessState = yield* store.findProfileAccessState({
      actorUserId: input.actorUserId,
      profileId,
    });
    const duplicateError = profileAccessStateToDuplicateError(accessState);

    if (duplicateError !== undefined) {
      return yield* duplicateError;
    }

    const requestTime = yield* DateTime.nowAsDate;
    const yearMonth = firecrawlYearMonthFromDate(requestTime);
    const reservedRequest = yield* requestAccounting.reserveRequest({
      monthlyRequestBudget: config.monthlyRequestBudget,
      profileId,
      requestedByUserId: input.actorUserId,
      yearMonth,
    });
    const finalizedRequest = yield* EffectRuntime.gen(
      function* finalizeReservedRequest() {
        const scrapedProfile = yield* firecrawl
          .scrapeProfileHtml(profileId)
          .pipe(
            EffectRuntime.catch((error) =>
              EffectRuntime.gen(function* markRequestFailed() {
                const completedAt = yield* currentDate;
                yield* requestAccounting.markRequestFailed({
                  completedAt,
                  errorTag: error._tag,
                  requestId: reservedRequest.requestId,
                });
                return yield* error;
              })
            )
          );
        const creditsUsed = yield* parseFirecrawlCreditCount(
          scrapedProfile.metadata.creditsUsed ?? 1
        ).pipe(
          EffectRuntime.catch(() =>
            EffectRuntime.gen(function* markInvalidResponseFailed() {
              const completedAt = yield* currentDate;
              yield* requestAccounting.markRequestFailed({
                completedAt,
                errorTag: "FirecrawlResponseNotParseable",
                requestId: reservedRequest.requestId,
              });
              return yield* new FirecrawlResponseNotParseable({
                cause: new Error("Invalid Firecrawl creditsUsed"),
                profileId,
              });
            })
          )
        );
        const completedAt = yield* currentDate;
        yield* requestAccounting.markRequestSucceeded({
          cacheState: scrapedProfile.metadata.cacheState ?? null,
          completedAt,
          creditsUsed,
          firecrawlStatusCode: scrapedProfile.metadata.statusCode ?? null,
          requestId: reservedRequest.requestId,
        });
        return { creditsUsed, scrapedProfile };
      }
    ).pipe(
      EffectRuntime.onInterrupt(() =>
        EffectRuntime.gen(function* markInterruptedRequestFailed() {
          const completedAt = yield* currentDate;
          yield* requestAccounting.markRequestFailed({
            completedAt,
            errorTag: "Interrupted",
            requestId: reservedRequest.requestId,
          });
        })
      )
    );
    const { creditsUsed, scrapedProfile } = finalizedRequest;

    const parsedHtml = yield* parseMargonemProfileHtml({
      html: scrapedProfile.html,
      profileId,
    });

    const lastFetchedAt = yield* DateTime.nowAsDate;

    return {
      firecrawlCreditsUsed: creditsUsed,
      generatedProfileUrl: toMargonemProfileUrl(profileId),
      jarunaCharacters: parsedHtml.jarunaCharacters,
      lastFetchedAt,
      profileId,
      suggestedAccountName: parsedHtml.suggestedAccountName,
    };
  }
);

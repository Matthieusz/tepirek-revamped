import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { firecrawlYearMonthFromDate } from "../../../domain/squad-builder/firecrawl-year-month.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { computeMargonemAccountRefetchDiff } from "../../../domain/squad-builder/margonem-account-refetch-diff.ts";
import type { MargonemAccountRefetchDiff } from "../../../domain/squad-builder/margonem-account-refetch-diff.ts";
import { parseMargonemProfileHtml } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import type { ParseMargonemProfileHtmlError } from "../../../domain/squad-builder/margonem-profile-html-parser.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.ts";
import type { PendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.ts";
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
import { AccountRefetchStoreService } from "./account-refetch-store.ts";
import type {
  ActorDoesNotOwnMargonemAccount,
  FirecrawlBudgetError,
  MargonemAccountNotFound,
  SquadBuilderPersistenceUnavailable,
} from "./account-refetch-store.ts";

export interface PreviewAccountRefetchInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}

export interface PreviewAccountRefetchOutput {
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly fetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly diff: MargonemAccountRefetchDiff;
}

export type PreviewAccountRefetchError =
  | MargonemAccountNotFound
  | ActorDoesNotOwnMargonemAccount
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

const pendingRefetchPolicy = { expiresAfterMinutes: 30 } as const;

const currentDate = DateTime.nowAsDate;

/** Fetch latest account HTML and store a pending refetch diff for owner confirmation. */
export const preview = EffectRuntime.fn("AccountRefetch.preview")(
  function* previewAccountRefetchEffect(input: PreviewAccountRefetchInput) {
    const store = yield* AccountRefetchStoreService;
    const requestAccounting = yield* FirecrawlRequestAccountingStoreService;
    const config = yield* FirecrawlConfigService;
    const firecrawl = yield* FirecrawlClientService;
    const account = yield* store.getAccountForRefetch(input);
    const requestTime = yield* DateTime.nowAsDate;
    const yearMonth = firecrawlYearMonthFromDate(requestTime);
    const reservedRequest = yield* requestAccounting.reserveRequest({
      monthlyRequestBudget: config.monthlyRequestBudget,
      profileId: account.profileId,
      requestedByUserId: input.actorUserId,
      yearMonth,
    });
    const finalizedRequest = yield* EffectRuntime.gen(
      function* finalizeReservedRequest() {
        const scrapedProfile = yield* firecrawl
          .scrapeProfileHtml(account.profileId)
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
                profileId: account.profileId,
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
      profileId: account.profileId,
    });

    const fetchedDateTime = yield* DateTime.now;
    const fetchedAt = DateTime.toDate(fetchedDateTime);
    const diff = computeMargonemAccountRefetchDiff({
      accountId: account.accountId,
      currentCharacters: account.currentCharacters,
      fetchedAt,
      latestCharacters: parsedHtml.jarunaCharacters,
      profileId: account.profileId,
    });
    const pending = yield* store.createPendingRefetch({
      accountId: account.accountId,
      actorUserId: input.actorUserId,
      diff,
      expiresAt: fetchedDateTime.pipe(
        DateTime.add({ minutes: pendingRefetchPolicy.expiresAfterMinutes }),
        DateTime.toDate
      ),
      fetchedAt,
      firecrawlCreditsUsed: creditsUsed,
      latestCharacters: parsedHtml.jarunaCharacters,
      profileId: account.profileId,
    });

    return {
      accountId: account.accountId,
      diff,
      fetchedAt,
      firecrawlCreditsUsed: creditsUsed,
      generatedProfileUrl: toMargonemProfileUrl(account.profileId),
      profileId: account.profileId,
      refetchPreviewId: pending.id,
    };
  }
);

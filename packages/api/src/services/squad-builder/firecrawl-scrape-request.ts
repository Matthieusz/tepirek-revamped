import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import { firecrawlYearMonthFromDate } from "../../domain/squad-builder/firecrawl-year-month.ts";
import type { MargonemProfileId } from "../../domain/squad-builder/margonem-profile-id.ts";
import {
  FirecrawlClientService,
  FirecrawlResponseNotParseable,
} from "./firecrawl-client.ts";
import type { FirecrawlScrapeError } from "./firecrawl-client.ts";
import {
  FirecrawlConfigService,
  parseFirecrawlCreditCount,
} from "./firecrawl-config.ts";
import type { FirecrawlCreditCount } from "./firecrawl-config.ts";
import { FirecrawlRequestAccountingStoreService } from "./firecrawl-request-accounting-store.ts";
import type { FirecrawlBudgetError } from "./firecrawl-request-accounting-store.ts";
import type { SquadBuilderPersistenceUnavailable } from "./squad-groups/squad-group-errors.ts";

/** Actor and profile whose request will consume the configured monthly budgets. */
export interface ScrapeProfileInput {
  readonly actorUserId: AppUserId;
  readonly profileId: MargonemProfileId;
}

/** Successfully accounted HTML; profile validity and preview persistence are not implied. */
export interface ScrapeProfileOutput {
  readonly html: string;
  readonly creditsUsed: FirecrawlCreditCount;
}

/** Existing budget, scrape, or accounting failures; accounting failures take precedence. */
export type ScrapeProfileError =
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | SquadBuilderPersistenceUnavailable;

const currentDate = DateTime.nowAsDate;

/** Reserve and account one profile scrape. Only the reserved lifecycle has interruption cleanup. */
export const scrapeProfile = EffectRuntime.fn(
  "FirecrawlScrapeRequest.scrapeProfile"
)(function* scrapeProfileEffect(
  input: ScrapeProfileInput
): EffectRuntime.fn.Return<
  ScrapeProfileOutput,
  ScrapeProfileError,
  | FirecrawlClientService
  | FirecrawlConfigService
  | FirecrawlRequestAccountingStoreService
> {
  const requestAccounting = yield* FirecrawlRequestAccountingStoreService;
  const config = yield* FirecrawlConfigService;
  const firecrawl = yield* FirecrawlClientService;
  const { profileId } = input;
  const requestTime = yield* DateTime.nowAsDate;
  const yearMonth = firecrawlYearMonthFromDate(requestTime);

  const reservedRequest = yield* requestAccounting.reserveRequest({
    monthlyRequestBudget: config.monthlyRequestBudget,
    perUserMonthlyRequestBudget: config.perUserMonthlyRequestBudget,
    profileId,
    requestedByUserId: input.actorUserId,
    yearMonth,
  });

  const finalizedRequest = yield* EffectRuntime.gen(
    function* finalizeReservedRequest() {
      const scrapedProfile = yield* firecrawl.scrapeProfileHtml(profileId).pipe(
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

  return {
    creditsUsed,
    html: scrapedProfile.html,
  };
});

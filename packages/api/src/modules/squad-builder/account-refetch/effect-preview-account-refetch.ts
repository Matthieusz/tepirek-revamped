import * as ClockRuntime from "effect/Clock";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import { EffectFirecrawlClient } from "../effect-firecrawl-client.js";
import type { FirecrawlScrapeError } from "../firecrawl-client.js";
import {
  EffectFirecrawlConfig,
  parseFirecrawlCreditCount,
} from "../firecrawl-config.js";
import { firecrawlYearMonthFromDate } from "../firecrawl-year-month.js";
import { computeMargonemAccountRefetchDiff } from "../margonem-account-refetch-diff.js";
import { parseMargonemProfileHtml } from "../margonem-profile-html-parser.js";
import { toMargonemProfileUrl } from "../margonem-profile-url.js";
import { isError } from "../result.js";
import { EffectAccountRefetchStore } from "./effect-account-refetch-store.js";
import type {
  PreviewAccountRefetchError,
  PreviewAccountRefetchInput,
  PreviewAccountRefetchOutput,
} from "./preview-account-refetch.js";
import { pendingRefetchPolicy } from "./preview-account-refetch.js";

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60_000);

/** Effect service module that previews a manual saved-account refetch. */
export class EffectPreviewAccountRefetch {
  readonly serviceName = "EffectPreviewAccountRefetch";

  /** Fetch latest account HTML and store a pending refetch diff for owner confirmation. */
  preview(
    input: PreviewAccountRefetchInput,
    options: { readonly signal?: AbortSignal } = {}
  ): Effect<
    PreviewAccountRefetchOutput,
    PreviewAccountRefetchError,
    EffectAccountRefetchStore | EffectFirecrawlClient | EffectFirecrawlConfig
  > {
    void this.serviceName;

    return EffectRuntime.gen(function* previewAccountRefetchEffect() {
      const config = yield* EffectFirecrawlConfig;
      const firecrawl = yield* EffectFirecrawlClient;
      const account = yield* EffectAccountRefetchStore.use((store) =>
        store.getAccountForRefetch(input)
      );
      const requestTimeMillis = yield* ClockRuntime.currentTimeMillis;
      const yearMonth = firecrawlYearMonthFromDate(new Date(requestTimeMillis));
      const reservedRequest = yield* EffectAccountRefetchStore.use((store) =>
        store.reserveRequest({
          monthlyRequestBudget: config.monthlyRequestBudget,
          profileId: account.profileId,
          requestedByUserId: input.actorUserId,
          yearMonth,
        })
      );
      const scrapedProfileResult = yield* EffectRuntime.tryPromise({
        catch: (cause) =>
          ({
            _tag: "FirecrawlRequestFailed",
            cause,
            profileId: account.profileId,
          }) satisfies FirecrawlScrapeError,
        try: () => firecrawl.scrapeProfileHtml(account.profileId, options),
      });

      if (isError(scrapedProfileResult)) {
        yield* EffectAccountRefetchStore.use((store) =>
          store.markRequestFailed({
            errorTag: scrapedProfileResult.error._tag,
            requestId: reservedRequest.requestId,
          })
        );
        return yield* EffectRuntime.fail(scrapedProfileResult.error);
      }

      const scrapedProfile = scrapedProfileResult.value;
      const creditsUsed = parseFirecrawlCreditCount(
        scrapedProfile.metadata.creditsUsed ?? 1
      );

      if (isError(creditsUsed)) {
        yield* EffectAccountRefetchStore.use((store) =>
          store.markRequestFailed({
            errorTag: creditsUsed.error._tag,
            requestId: reservedRequest.requestId,
          })
        );
        return yield* EffectRuntime.fail({
          _tag: "FirecrawlResponseNotParseable" as const,
          cause: new Error("Invalid Firecrawl creditsUsed"),
          profileId: account.profileId,
        });
      }

      yield* EffectAccountRefetchStore.use((store) =>
        store.markRequestSucceeded({
          cacheState: scrapedProfile.metadata.cacheState ?? null,
          creditsUsed: creditsUsed.value,
          firecrawlStatusCode: scrapedProfile.metadata.statusCode ?? null,
          requestId: reservedRequest.requestId,
        })
      );

      const parsedHtml = parseMargonemProfileHtml({
        html: scrapedProfile.html,
        profileId: account.profileId,
      });

      if (isError(parsedHtml)) {
        return yield* EffectRuntime.fail(parsedHtml.error);
      }

      const fetchedTimeMillis = yield* ClockRuntime.currentTimeMillis;
      const fetchedAt = new Date(fetchedTimeMillis);
      const diff = computeMargonemAccountRefetchDiff({
        accountId: account.accountId,
        currentCharacters: account.currentCharacters,
        fetchedAt,
        latestCharacters: parsedHtml.value.jarunaCharacters,
        profileId: account.profileId,
      });
      const pending = yield* EffectAccountRefetchStore.use((store) =>
        store.createPendingRefetch({
          accountId: account.accountId,
          actorUserId: input.actorUserId,
          diff,
          expiresAt: addMinutes(
            fetchedAt,
            pendingRefetchPolicy.expiresAfterMinutes
          ),
          fetchedAt,
          firecrawlCreditsUsed: creditsUsed.value,
          latestCharacters: parsedHtml.value.jarunaCharacters,
          profileId: account.profileId,
        })
      );

      return {
        accountId: account.accountId,
        diff,
        fetchedAt,
        firecrawlCreditsUsed: creditsUsed.value,
        generatedProfileUrl: toMargonemProfileUrl(account.profileId),
        profileId: account.profileId,
        refetchPreviewId: pending.id,
      };
    });
  }
}

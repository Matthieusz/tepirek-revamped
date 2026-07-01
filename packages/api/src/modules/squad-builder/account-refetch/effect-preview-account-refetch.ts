import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import";
import type {
  FirecrawlClient,
  FirecrawlScrapeError,
} from "../firecrawl-client";
import { parseFirecrawlCreditCount } from "../firecrawl-config";
import type { FirecrawlConfig } from "../firecrawl-config";
import { firecrawlYearMonthFromDate } from "../firecrawl-year-month";
import { computeMargonemAccountRefetchDiff } from "../margonem-account-refetch-diff";
import { parseMargonemProfileHtml } from "../margonem-profile-html-parser";
import { toMargonemProfileUrl } from "../margonem-profile-url";
import { isError } from "../result";
import { EffectSquadGroupStore } from "../squad-groups/squad-group-store";
import type {
  PreviewAccountRefetchError,
  PreviewAccountRefetchInput,
  PreviewAccountRefetchOutput,
} from "./preview-account-refetch";
import { pendingRefetchPolicy } from "./preview-account-refetch";

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60_000);

/** Effect service module that previews a manual saved-account refetch. */
export class EffectPreviewAccountRefetch {
  private readonly firecrawl: FirecrawlClient;
  private readonly clock: Clock;
  private readonly config: FirecrawlConfig;

  constructor(
    firecrawl: FirecrawlClient,
    clock: Clock,
    config: FirecrawlConfig
  ) {
    this.firecrawl = firecrawl;
    this.clock = clock;
    this.config = config;
  }

  /** Fetch latest account HTML and store a pending refetch diff for owner confirmation. */
  preview(
    input: PreviewAccountRefetchInput,
    options: { readonly signal?: AbortSignal } = {}
  ): Effect<
    PreviewAccountRefetchOutput,
    PreviewAccountRefetchError,
    EffectSquadGroupStore
  > {
    const { clock, config, firecrawl } = this;

    return EffectRuntime.gen(function* previewAccountRefetchEffect() {
      const account = yield* EffectSquadGroupStore.use((store) =>
        store.getAccountForRefetch(input)
      );
      const yearMonth = firecrawlYearMonthFromDate(clock.now());
      const reservedRequest = yield* EffectSquadGroupStore.use((store) =>
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
        yield* EffectSquadGroupStore.use((store) =>
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
        yield* EffectSquadGroupStore.use((store) =>
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

      yield* EffectSquadGroupStore.use((store) =>
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

      const fetchedAt = clock.now();
      const diff = computeMargonemAccountRefetchDiff({
        accountId: account.accountId,
        currentCharacters: account.currentCharacters,
        fetchedAt,
        latestCharacters: parsedHtml.value.jarunaCharacters,
        profileId: account.profileId,
      });
      const pending = yield* EffectSquadGroupStore.use((store) =>
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

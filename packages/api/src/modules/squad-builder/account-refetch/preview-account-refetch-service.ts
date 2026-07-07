import * as ClockRuntime from "effect/Clock";
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { firecrawlYearMonthFromDate } from "../../../domain/squad-builder/firecrawl-year-month.js";
import { computeMargonemAccountRefetchDiff } from "../../../domain/squad-builder/margonem-account-refetch-diff.js";
import { parseMargonemProfileHtml } from "../../../domain/squad-builder/margonem-profile-html-parser.js";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.js";
import { serviceUse } from "../../../effect/service-use.js";
import { FirecrawlClientService } from "../firecrawl-client-service.js";
import { FirecrawlResponseNotParseable } from "../firecrawl-client.js";
import type { FirecrawlScrapeError } from "../firecrawl-client.js";
import {
  FirecrawlConfigService,
  parseFirecrawlCreditCount,
} from "../firecrawl-config.js";
import { AccountRefetchStoreService } from "./account-refetch-store-service.js";
import type { PreviewAccountRefetchInput } from "./preview-account-refetch.js";
import { pendingRefetchPolicy } from "./preview-account-refetch.js";

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60_000);

/** Fetch latest account HTML and store a pending refetch diff for owner confirmation. */
export const preview = EffectRuntime.fn("AccountRefetch.preview")(
  function* previewAccountRefetchEffect(
    input: PreviewAccountRefetchInput,
    options: { readonly signal?: AbortSignal } = {}
  ) {
    const config = yield* FirecrawlConfigService;
    const firecrawl = yield* FirecrawlClientService;
    const account = yield* AccountRefetchStoreService.use((store) =>
      store.getAccountForRefetch(input)
    );
    const requestTimeMillis = yield* ClockRuntime.currentTimeMillis;
    const yearMonth = firecrawlYearMonthFromDate(new Date(requestTimeMillis));
    const reservedRequest = yield* AccountRefetchStoreService.use((store) =>
      store.reserveRequest({
        monthlyRequestBudget: config.monthlyRequestBudget,
        profileId: account.profileId,
        requestedByUserId: input.actorUserId,
        yearMonth,
      })
    );
    const scrapedProfile = yield* EffectRuntime.tryPromise({
      catch: (cause: unknown) => cause as FirecrawlScrapeError,
      try: () => firecrawl.scrapeProfileHtml(account.profileId, options),
    }).pipe(
      EffectRuntime.catch((error) =>
        AccountRefetchStoreService.use((store) =>
          store.markRequestFailed({
            errorTag: error._tag,
            requestId: reservedRequest.requestId,
          })
        ).pipe(EffectRuntime.andThen(EffectRuntime.fail(error)))
      )
    );

    const creditsUsed = yield* parseFirecrawlCreditCount(
      scrapedProfile.metadata.creditsUsed ?? 1
    ).pipe(
      EffectRuntime.catch(() =>
        AccountRefetchStoreService.use((store) =>
          store.markRequestFailed({
            errorTag: "FirecrawlResponseNotParseable",
            requestId: reservedRequest.requestId,
          })
        ).pipe(
          EffectRuntime.andThen(
            EffectRuntime.fail(
              new FirecrawlResponseNotParseable({
                cause: new Error("Invalid Firecrawl creditsUsed"),
                profileId: account.profileId,
              })
            )
          )
        )
      )
    );

    yield* AccountRefetchStoreService.use((store) =>
      store.markRequestSucceeded({
        cacheState: scrapedProfile.metadata.cacheState ?? null,
        creditsUsed,
        firecrawlStatusCode: scrapedProfile.metadata.statusCode ?? null,
        requestId: reservedRequest.requestId,
      })
    );

    const parsedHtml = yield* parseMargonemProfileHtml({
      html: scrapedProfile.html,
      profileId: account.profileId,
    });

    const fetchedTimeMillis = yield* ClockRuntime.currentTimeMillis;
    const fetchedAt = new Date(fetchedTimeMillis);
    const diff = computeMargonemAccountRefetchDiff({
      accountId: account.accountId,
      currentCharacters: account.currentCharacters,
      fetchedAt,
      latestCharacters: parsedHtml.jarunaCharacters,
      profileId: account.profileId,
    });
    const pending = yield* AccountRefetchStoreService.use((store) =>
      store.createPendingRefetch({
        accountId: account.accountId,
        actorUserId: input.actorUserId,
        diff,
        expiresAt: addMinutes(
          fetchedAt,
          pendingRefetchPolicy.expiresAfterMinutes
        ),
        fetchedAt,
        firecrawlCreditsUsed: creditsUsed,
        latestCharacters: parsedHtml.jarunaCharacters,
        profileId: account.profileId,
      })
    );

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

export interface Interface {
  readonly preview: typeof preview;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/PreviewAccountRefetchService"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* layer() {
    yield* AccountRefetchStoreService;
    yield* FirecrawlConfigService;
    yield* FirecrawlClientService;
    return { preview };
  })
);

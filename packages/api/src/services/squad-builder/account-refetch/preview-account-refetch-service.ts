import * as ClockRuntime from "effect/Clock";
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

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
import { AccountRefetchStoreService } from "./account-refetch-store-service.ts";
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

const currentDate = ClockRuntime.currentTimeMillis.pipe(
  EffectRuntime.map((milliseconds) => new Date(milliseconds))
);

const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60_000);

/** Fetch latest account HTML and store a pending refetch diff for owner confirmation. */
export const preview = EffectRuntime.fn("AccountRefetch.preview")(
  function* previewAccountRefetchEffect(input: PreviewAccountRefetchInput) {
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
    const scrapedProfile = yield* firecrawl
      .scrapeProfileHtml(account.profileId)
      .pipe(
        EffectRuntime.catch((error) =>
          EffectRuntime.gen(function* markRequestFailed() {
            const completedAt = yield* currentDate;
            yield* AccountRefetchStoreService.use((store) =>
              store.markRequestFailed({
                completedAt,
                errorTag: error._tag,
                requestId: reservedRequest.requestId,
              })
            );
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
          yield* AccountRefetchStoreService.use((store) =>
            store.markRequestFailed({
              completedAt,
              errorTag: "FirecrawlResponseNotParseable",
              requestId: reservedRequest.requestId,
            })
          );
          return yield* new FirecrawlResponseNotParseable({
            cause: new Error("Invalid Firecrawl creditsUsed"),
            profileId: account.profileId,
          });
        })
      )
    );

    const completedAt = yield* currentDate;
    yield* AccountRefetchStoreService.use((store) =>
      store.markRequestSucceeded({
        cacheState: scrapedProfile.metadata.cacheState ?? null,
        completedAt,
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

const makePreview = (
  store: typeof AccountRefetchStoreService.Service,
  config: typeof FirecrawlConfigService.Service,
  firecrawl: typeof FirecrawlClientService.Service
) =>
  EffectRuntime.fn("AccountRefetch.preview")(
    (input: PreviewAccountRefetchInput) =>
      preview(input).pipe(
        EffectRuntime.provideService(AccountRefetchStoreService, store),
        EffectRuntime.provideService(FirecrawlConfigService, config),
        EffectRuntime.provideService(FirecrawlClientService, firecrawl)
      )
  );

export interface PreviewAccountRefetch {
  readonly preview: ReturnType<typeof makePreview>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class PreviewAccountRefetchService extends Context.Service<
  PreviewAccountRefetchService,
  PreviewAccountRefetch
>()("@tepirek-revamped/api/squad-builder/PreviewAccountRefetchService") {}

export const layer = Layer.effect(
  PreviewAccountRefetchService,
  EffectRuntime.gen(function* layer() {
    const store = yield* AccountRefetchStoreService;
    const config = yield* FirecrawlConfigService;
    const firecrawl = yield* FirecrawlClientService;
    return { preview: makePreview(store, config, firecrawl) };
  })
);

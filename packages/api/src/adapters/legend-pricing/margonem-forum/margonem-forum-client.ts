/* eslint-disable max-classes-per-file -- Margonem forum boundary errors form one adapter boundary. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then -- Effect.catch uses a callback, not a Promise chain.
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { LegendaryEnemyCategory } from "../../../domain/legend-pricing/legend-catalog.ts";
import { firecrawlYearMonthFromDate } from "../../../domain/squad-builder/firecrawl-year-month.ts";
import { FirecrawlClientService } from "../../../services/squad-builder/firecrawl-client.ts";
import {
  FirecrawlConfigService,
  parseFirecrawlCreditCount,
} from "../../../services/squad-builder/firecrawl-config.ts";
import { FirecrawlRequestAccountingStoreService } from "../../../services/squad-builder/firecrawl-request-accounting-store.ts";

const MARGONEM_FORUM_TOPIC_URLS = {
  elite2: "https://forum.margonem.pl/?task=forum&show=posts&id=514805&ps=0",
  hero: "https://forum.margonem.pl/?task=forum&show=posts&id=514740&ps=0",
} satisfies Record<LegendaryEnemyCategory, string>;
const MARGONEM_FORUM_MAXIMUM_RESPONSE_BYTES = 20_000_000;
const loginPagePattern = /(?:task=login|name=["']?login|zaloguj\s+się)/iu;
const postContainerPattern =
  /<table\s+id=["']?posts["']?[^>]*>[\s\S]*?name=["']post\d+/iu;

/** Raw HTML returned by one fixed Margonem forum guide topic. */
export interface MargonemForumTopicPage {
  readonly category: LegendaryEnemyCategory;
  readonly html: string;
  readonly url: string;
}

/** Failure while downloading a Margonem forum guide. */
class MargonemForumRequestFailed extends Schema.TaggedErrorClass<MargonemForumRequestFailed>()(
  "MargonemForumRequestFailed",
  {
    category: LegendaryEnemyCategory,
    cause: Schema.Defect(),
    status: Schema.optionalKey(Schema.Int),
  }
) {}

/** A response was not a complete HTML guide document and is unsafe to parse. */
class MargonemForumDocumentRejected extends Schema.TaggedErrorClass<MargonemForumDocumentRejected>()(
  "MargonemForumDocumentRejected",
  {
    category: LegendaryEnemyCategory,
    reason: Schema.String,
  }
) {}

/** Expected failures from the Margonem forum HTTP boundary. */
export type MargonemForumClientError =
  | MargonemForumDocumentRejected
  | MargonemForumRequestFailed;

/** Capability for downloading the two fixed official forum guide topics. */
export interface MargonemForumClient {
  readonly fetchTopic: (
    category: LegendaryEnemyCategory
  ) => Effect.Effect<MargonemForumTopicPage, MargonemForumClientError>;
}

/** Service tag for the Margonem forum guide downloader. */
export class MargonemForumClientService extends Context.Service<
  MargonemForumClientService,
  MargonemForumClient
>()("@tepirek-revamped/api/legend-pricing/MargonemForumClientService") {}

const requestFailed = (
  category: LegendaryEnemyCategory,
  cause: unknown,
  status?: number
): MargonemForumRequestFailed =>
  status === undefined
    ? new MargonemForumRequestFailed({ category, cause })
    : new MargonemForumRequestFailed({ category, cause, status });

const rejectDocument = (
  category: LegendaryEnemyCategory,
  reason: string
): MargonemForumDocumentRejected =>
  new MargonemForumDocumentRejected({ category, reason });

const validateDocument = (
  category: LegendaryEnemyCategory,
  html: string
): Effect.Effect<string, MargonemForumDocumentRejected> => {
  const { byteLength } = new TextEncoder().encode(html);
  if (byteLength > MARGONEM_FORUM_MAXIMUM_RESPONSE_BYTES) {
    return Effect.fail(rejectDocument(category, "response exceeds size limit"));
  }
  if (html.trim().length === 0) {
    return Effect.fail(rejectDocument(category, "response is empty"));
  }
  if (loginPagePattern.test(html) && !postContainerPattern.test(html)) {
    return Effect.fail(rejectDocument(category, "forum returned a login page"));
  }
  if (
    !/<html\b/iu.test(html) ||
    !/<\/html\s*>/iu.test(html) ||
    !/<body\b/iu.test(html) ||
    !/<\/body\s*>/iu.test(html) ||
    !postContainerPattern.test(html)
  ) {
    const reason = /<h2>\s*Momencik\s*<\/h2>/iu.test(html)
      ? "forum returned a waiting or block page"
      : "forum returned incomplete or unsupported HTML";
    return Effect.fail(rejectDocument(category, reason));
  }

  return Effect.succeed(html);
};

/** Live Margonem forum downloader using the shared Firecrawl service. */
export const MargonemForumClientLiveLayer: Layer.Layer<
  MargonemForumClientService,
  never,
  | FirecrawlClientService
  | FirecrawlConfigService
  | FirecrawlRequestAccountingStoreService
> = Layer.effect(
  MargonemForumClientService,
  Effect.gen(function* MargonemForumClientLiveLayer() {
    const accounting = yield* FirecrawlRequestAccountingStoreService;
    const config = yield* FirecrawlConfigService;
    const firecrawl = yield* FirecrawlClientService;

    const scrapeTopic = Effect.fn("MargonemForumClient.scrapeTopic")(
      function* scrapeTopicEffect(
        category: LegendaryEnemyCategory,
        url: string
      ) {
        const requestedAt = yield* DateTime.nowAsDate;
        const reserved = yield* accounting
          .reserveRequest({
            monthlyRequestBudget: config.monthlyRequestBudget,
            perUserMonthlyRequestBudget: config.perUserMonthlyRequestBudget,
            yearMonth: firecrawlYearMonthFromDate(requestedAt),
          })
          .pipe(Effect.mapError((cause) => requestFailed(category, cause)));

        const scrape = firecrawl.scrapeUrlHtml(url).pipe(
          Effect.catch((error) =>
            Effect.gen(function* recordFailedScrape() {
              const completedAt = yield* DateTime.nowAsDate;
              yield* accounting
                .markRequestFailed({
                  completedAt,
                  errorTag: error._tag,
                  requestId: reserved.requestId,
                })
                .pipe(
                  Effect.mapError((cause) => requestFailed(category, cause))
                );
              return yield* requestFailed(category, error);
            })
          ),
          Effect.onInterrupt(() =>
            Effect.gen(function* recordInterruptedScrape() {
              const completedAt = yield* DateTime.nowAsDate;
              yield* accounting
                .markRequestFailed({
                  completedAt,
                  errorTag: "Interrupted",
                  requestId: reserved.requestId,
                })
                .pipe(
                  Effect.mapError((cause) => requestFailed(category, cause))
                );
            })
          )
        );
        const document = yield* scrape;
        const creditsUsed = yield* parseFirecrawlCreditCount(
          document.metadata.creditsUsed ?? 1
        ).pipe(Effect.mapError((cause) => requestFailed(category, cause)));
        const completedAt = yield* DateTime.nowAsDate;

        yield* accounting
          .markRequestSucceeded({
            cacheState: document.metadata.cacheState ?? null,
            completedAt,
            creditsUsed,
            firecrawlStatusCode: document.metadata.statusCode ?? null,
            requestId: reserved.requestId,
          })
          .pipe(Effect.mapError((cause) => requestFailed(category, cause)));

        return document;
      }
    );

    return MargonemForumClientService.of({
      fetchTopic: Effect.fn("MargonemForumClient.fetchTopic")(
        function* fetchTopic(category) {
          const url = MARGONEM_FORUM_TOPIC_URLS[category];
          const document = yield* scrapeTopic(category, url);
          const status = document.metadata.statusCode;
          if (status !== undefined && (status < 200 || status >= 300)) {
            return yield* requestFailed(
              category,
              new Error(`Firecrawl returned origin status ${status}`),
              status
            );
          }

          const { contentType } = document.metadata;
          if (
            contentType !== undefined &&
            !contentType.toLowerCase().startsWith("text/html")
          ) {
            return yield* rejectDocument(
              category,
              "response content type is not HTML"
            );
          }

          yield* validateDocument(category, document.html);
          return { category, html: document.html, url };
        }
      ),
    });
  })
);

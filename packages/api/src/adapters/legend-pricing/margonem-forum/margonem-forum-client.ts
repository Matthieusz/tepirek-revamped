/* eslint-disable max-classes-per-file -- Margonem forum boundary errors form one adapter boundary. */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as HttpClient from "effect/unstable/http/HttpClient";
import type * as HttpClientError from "effect/unstable/http/HttpClientError";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";

import { LegendaryEnemyCategory } from "../../../domain/legend-pricing/legend-catalog.ts";

const MARGONEM_FORUM_USER_AGENT =
  "tepirek-revamped legend pricing sync/0.1 (+https://tepirek.pl)";
const MARGONEM_FORUM_TOPIC_URLS = {
  elite2: "https://forum.margonem.pl/?task=forum&show=posts&id=514805&ps=0",
  hero: "https://forum.margonem.pl/?task=forum&show=posts&id=514740&ps=0",
} satisfies Record<LegendaryEnemyCategory, string>;
const MARGONEM_FORUM_REQUEST_TIMEOUT = "20 seconds";
const MARGONEM_FORUM_MAXIMUM_RESPONSE_BYTES = 2_000_000;
const MARGONEM_FORUM_RETRY_LIMIT = 2;
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

const retrySchedule = Schedule.exponential(200).pipe(
  Schedule.jittered,
  Schedule.upTo({ times: MARGONEM_FORUM_RETRY_LIMIT })
);

const makeForumClient = (client: HttpClient.HttpClient) =>
  client.pipe(
    HttpClient.filterStatusOk,
    HttpClient.retryTransient({
      retryOn: "errors-only",
      schedule: retrySchedule,
    })
  );

const statusFromHttpError = (
  error: HttpClientError.HttpClientError
): number | undefined =>
  error.reason._tag === "StatusCodeError"
    ? error.reason.response.status
    : undefined;

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

/** Live Margonem forum downloader using the Effect HTTP client. */
export const MargonemForumClientLiveLayer: Layer.Layer<
  MargonemForumClientService,
  never,
  HttpClient.HttpClient
> = Layer.effect(
  MargonemForumClientService,
  Effect.gen(function* MargonemForumClientLiveLayer() {
    const client = makeForumClient(yield* HttpClient.HttpClient);

    return MargonemForumClientService.of({
      fetchTopic: Effect.fn("MargonemForumClient.fetchTopic")(
        function* fetchTopic(category) {
          const url = MARGONEM_FORUM_TOPIC_URLS[category];
          const request = HttpClientRequest.get(url).pipe(
            HttpClientRequest.setHeaders({
              accept: "text/html",
              "user-agent": MARGONEM_FORUM_USER_AGENT,
            })
          );
          const response = yield* client.execute(request).pipe(
            Effect.timeout(MARGONEM_FORUM_REQUEST_TIMEOUT),
            Effect.mapError((cause) => {
              const status =
                cause._tag === "HttpClientError"
                  ? statusFromHttpError(cause)
                  : undefined;
              return status === undefined
                ? new MargonemForumRequestFailed({ category, cause })
                : new MargonemForumRequestFailed({ category, cause, status });
            })
          );
          const contentType = response.headers["content-type"];
          if (
            contentType === undefined ||
            !contentType.toLowerCase().startsWith("text/html")
          ) {
            return yield* rejectDocument(
              category,
              "response content type is not HTML"
            );
          }

          const declaredLength = Number(response.headers["content-length"]);
          if (
            Number.isFinite(declaredLength) &&
            declaredLength > MARGONEM_FORUM_MAXIMUM_RESPONSE_BYTES
          ) {
            return yield* rejectDocument(
              category,
              "response exceeds size limit"
            );
          }

          const html = yield* response.text.pipe(
            Effect.mapError(
              (cause) =>
                new MargonemForumDocumentRejected({
                  category,
                  reason: `could not read HTML response: ${cause._tag}`,
                })
            )
          );
          yield* validateDocument(category, html);

          return { category, html, url };
        }
      ),
    });
  })
);

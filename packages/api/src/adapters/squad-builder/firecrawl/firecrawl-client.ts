import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";

import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.ts";
import {
  FirecrawlClientService,
  FirecrawlRequestFailed,
  FirecrawlResponseNotParseable,
  FirecrawlUrlRequestFailed,
  FirecrawlUrlResponseNotParseable,
} from "../../../services/squad-builder/firecrawl-client.ts";
import {
  FirecrawlConfigService,
  parseFirecrawlCreditCount,
} from "../../../services/squad-builder/firecrawl-config.ts";

const FIRECRAWL_API_BASE_URL = "https://api.firecrawl.dev/v2";
const FIRECRAWL_SCRAPE_PATH = "/scrape";
const FIRECRAWL_SCRAPE_DEADLINE = "30 seconds";
const FIRECRAWL_METADATA_NUMBER = Schema.Finite;
const FIRECRAWL_METADATA_STRING = Schema.String.check(Schema.isMaxLength(2048));
const FIRECRAWL_PROVIDER_FIELD = Schema.String.check(Schema.isMaxLength(512));

const FirecrawlDocumentSchema = Schema.Struct({
  html: Schema.String.check(Schema.isMinLength(1)),
  metadata: Schema.optionalKey(
    Schema.Struct({
      cacheState: Schema.optionalKey(FIRECRAWL_METADATA_STRING),
      contentType: Schema.optionalKey(FIRECRAWL_METADATA_STRING),
      creditsUsed: Schema.optionalKey(FIRECRAWL_METADATA_NUMBER),
      sourceURL: Schema.optionalKey(FIRECRAWL_METADATA_STRING),
      statusCode: Schema.optionalKey(FIRECRAWL_METADATA_NUMBER),
      url: Schema.optionalKey(FIRECRAWL_METADATA_STRING),
    })
  ),
});

const FirecrawlScrapeRequestSchema = Schema.Struct({
  formats: Schema.Tuple([Schema.Literal("html")]),
  onlyMainContent: Schema.optionalKey(Schema.Boolean),
  url: Schema.String,
});

const FirecrawlSuccessEnvelopeSchema = Schema.Struct({
  data: FirecrawlDocumentSchema,
  success: Schema.Literal(true),
});

const FirecrawlFailureEnvelopeSchema = Schema.Struct({
  code: Schema.optionalKey(FIRECRAWL_PROVIDER_FIELD),
  error: Schema.optionalKey(FIRECRAWL_PROVIDER_FIELD),
  success: Schema.Literal(false),
});

const FirecrawlResponseEnvelopeSchema = Schema.Union([
  FirecrawlSuccessEnvelopeSchema,
  FirecrawlFailureEnvelopeSchema,
]);

type FirecrawlFailureEnvelope = Schema.Schema.Type<
  typeof FirecrawlFailureEnvelopeSchema
>;

const makeProviderFailureCause = (
  status: number,
  envelope: FirecrawlFailureEnvelope
) => ({
  code: envelope.code,
  error: envelope.error,
  status,
});

const decodeFirecrawlResponse = (
  response: HttpClientResponse.HttpClientResponse
) =>
  Effect.gen(function* decodeResponse() {
    if (response.status !== 200) {
      const decodedFailure = yield* Effect.exit(
        HttpClientResponse.schemaBodyJson(FirecrawlFailureEnvelopeSchema)(
          response
        )
      );

      if (Exit.isSuccess(decodedFailure)) {
        return yield* new FirecrawlUrlRequestFailed({
          cause: makeProviderFailureCause(
            response.status,
            decodedFailure.value
          ),
        });
      }

      return yield* new FirecrawlUrlRequestFailed({
        cause: {
          cause: decodedFailure.cause,
          status: response.status,
        },
      });
    }

    const envelope = yield* HttpClientResponse.schemaBodyJson(
      FirecrawlResponseEnvelopeSchema
    )(response).pipe(
      Effect.mapError(
        (cause) => new FirecrawlUrlResponseNotParseable({ cause })
      )
    );

    if (!envelope.success) {
      return yield* new FirecrawlUrlRequestFailed({
        cause: makeProviderFailureCause(response.status, envelope),
      });
    }

    return envelope.data;
  });

const makeFirecrawlClient = (
  client: HttpClient.HttpClient
): HttpClient.HttpClient =>
  client.pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(FIRECRAWL_API_BASE_URL))
  );

/** Firecrawl API/HTTP-backed implementation of HTML scraping. */
export const FirecrawlClientServiceLiveLayer: Layer.Layer<
  FirecrawlClientService,
  never,
  FirecrawlConfigService | HttpClient.HttpClient
> = Layer.effect(
  FirecrawlClientService,
  Effect.gen(function* FirecrawlClientServiceLiveLayer() {
    const config = yield* FirecrawlConfigService;
    const client = makeFirecrawlClient(yield* HttpClient.HttpClient);

    const scrapeHtml = Effect.fn("FirecrawlClient.scrapeHtml")(
      function* scrapeHtmlEffect(url: string, onlyMainContent?: boolean) {
        return yield* Effect.gen(function* scrapeOperation() {
          const requestBody =
            onlyMainContent === undefined
              ? { formats: ["html"] as const, url }
              : { formats: ["html"] as const, onlyMainContent, url };
          const request = yield* HttpClientRequest.post(
            FIRECRAWL_SCRAPE_PATH
          ).pipe(
            HttpClientRequest.acceptJson,
            HttpClientRequest.bearerToken(config.apiKey),
            HttpClientRequest.schemaBodyJson(FirecrawlScrapeRequestSchema)(
              requestBody
            ),
            Effect.mapError((cause) => new FirecrawlUrlRequestFailed({ cause }))
          );

          const response = yield* client
            .execute(request)
            .pipe(
              Effect.mapError(
                (cause) => new FirecrawlUrlRequestFailed({ cause })
              )
            );

          const document = yield* decodeFirecrawlResponse(response);
          const rawCredits = document.metadata?.creditsUsed;
          const creditsUsed =
            rawCredits === undefined
              ? 1
              : yield* parseFirecrawlCreditCount(rawCredits).pipe(
                  Effect.mapError(
                    () =>
                      new FirecrawlUrlResponseNotParseable({
                        cause: new Error("Invalid Firecrawl creditsUsed"),
                      })
                  )
                );

          return {
            html: document.html,
            metadata: {
              cacheState: document.metadata?.cacheState,
              contentType: document.metadata?.contentType,
              creditsUsed,
              sourceURL: document.metadata?.sourceURL,
              statusCode: document.metadata?.statusCode,
              url: document.metadata?.url,
            },
          };
        }).pipe(
          Effect.timeoutOrElse({
            duration: FIRECRAWL_SCRAPE_DEADLINE,
            orElse: () =>
              Effect.fail(
                new FirecrawlUrlRequestFailed({
                  cause: new Error("Firecrawl scrape timed out"),
                })
              ),
          })
        );
      }
    );

    return FirecrawlClientService.of({
      scrapeProfileHtml: Effect.fn("FirecrawlClient.scrapeProfileHtml")(
        function* scrapeProfileHtml(profileId: MargonemProfileId) {
          return yield* scrapeHtml(toMargonemProfileUrl(profileId)).pipe(
            Effect.mapError((error) =>
              error._tag === "FirecrawlUrlRequestFailed"
                ? new FirecrawlRequestFailed({
                    cause: error.cause,
                    profileId,
                  })
                : new FirecrawlResponseNotParseable({
                    cause: error.cause,
                    profileId,
                  })
            )
          );
        }
      ),
      scrapeUrlHtml: Effect.fn("FirecrawlClient.scrapeUrlHtml")(
        function* scrapeUrlHtml(url: string) {
          return yield* scrapeHtml(url, false);
        }
      ),
    });
  })
);

import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { HttpApiError } from "@tepirek-revamped/api/protocol/http-api-errors";
import { Layer, Schema } from "effect";
import type { Fiber } from "effect";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import * as HttpClientError from "effect/http/HttpClientError";
import type * as LayerType from "effect/Layer";
import * as Predicate from "effect/Predicate";

import { makeEffectQuery } from "@/lib/effect-query";
import { serverUrl } from "@/lib/env";
import { rememberFailureResponse } from "@/lib/query-failure-policy";

const fetchRequestInitLayer = Layer.succeed(FetchHttpClient.RequestInit, {
  credentials: "include",
} satisfies RequestInit);

const fetchHttpClientLayer = FetchHttpClient.layer.pipe(
  Layer.provide(fetchRequestInitLayer)
);

type UnexpectedApiError = HttpClientError.HttpClientError & {
  readonly reason: HttpClientError.DecodeError;
};

const isUnexpectedApiError = (
  error: Parameters<typeof HttpClientError.isHttpClientError>[0]
): error is UnexpectedApiError =>
  HttpClientError.isHttpClientError(error) &&
  Predicate.isTagged("DecodeError")(error.reason) &&
  error.reason.response.status >= 400;

const decodeUnexpectedApiError = (
  response: Effect.Effect<unknown, unknown, unknown>
): Effect.Effect<unknown, unknown, unknown> =>
  response.pipe(
    // Effect.catchIf receives an Effect handler, not a Promise callback.
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- required by Effect's recovery API
    Effect.catchIf(isUnexpectedApiError, (error) =>
      HttpClientResponse.schemaBodyJson(HttpApiError)(
        error.reason.response
      ).pipe(
        Effect.mapError(() => error),
        Effect.flatMap(Effect.fail)
      )
    )
  );

/** Builds the protocol client on the supplied HTTP transport, preserving safe failure guidance. */
export const makeAppHttpApiClient = Effect.gen(
  function* makeClientWithFailureGuidance() {
    // HttpApiClient gives transformResponse the decoded effect, not the response.
    // Pair allowlisted headers with its executing fiber until decoding finishes;
    // this also keeps simultaneous requests from sharing correlation IDs.
    const headersByFiber = new WeakMap<
      Fiber.Fiber<unknown, unknown>,
      Readonly<Record<string, string>>
    >();

    const httpClient = yield* HttpClient.HttpClient;

    return yield* HttpApiClient.makeWith(AppHttpApi, {
      baseUrl: serverUrl,
      httpClient: httpClient.pipe(
        HttpClient.transformResponse((response) =>
          Effect.tap(response, (value) =>
            Effect.withFiber((fiber) =>
              Effect.sync(() => {
                if (value.status >= 400) {
                  headersByFiber.set(fiber, {
                    "retry-after": value.headers["retry-after"] ?? "",
                    "x-request-id": value.headers["x-request-id"] ?? "",
                  });
                }
              })
            )
          )
        )
      ),
      transformResponse: (response) =>
        Effect.withFiber((fiber) =>
          decodeUnexpectedApiError(response).pipe(
            Effect.tapError((failure) =>
              Effect.sync(() => {
                const headers = headersByFiber.get(fiber);

                if (headers !== undefined && Schema.is(HttpApiError)(failure)) {
                  rememberFailureResponse(failure, headers);
                }
              })
            ),
            Effect.ensuring(
              Effect.sync(() => {
                headersByFiber.delete(fiber);
              })
            )
          )
        ),
    });
  }
);

/** Effect HttpApi client service for the shared application API contract. */
export class AppHttpApiClient extends Context.Service<
  AppHttpApiClient,
  HttpApiClient.ForApi<typeof AppHttpApi>
>()("@tepirek-revamped/web/AppHttpApiClient") {
  /** Live browser client layer that preserves better-auth cookies. */
  static readonly layer = Layer.effect(
    AppHttpApiClient,
    makeAppHttpApiClient
  ).pipe(Layer.provide(fetchHttpClientLayer));
}

/** Creates Effect Query factories; the caller owns and must dispose the runtime. */
export const makeAppEffectQuery = (layer: LayerType.Layer<AppHttpApiClient>) =>
  makeEffectQuery(layer);

/** Application Effect Query factories and their caller-owned runtime. */
export type AppEffectQuery = ReturnType<typeof makeAppEffectQuery>;

/**
 * Module-lived stateless browser transport, not a remote-data cache.
 * Never capture request-specific auth in this singleton; SSR uses request-owned layers.
 * See docs/web-remote-state.md for ownership and disposal rules.
 */
export const appEffectQuery = makeAppEffectQuery(AppHttpApiClient.layer);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void appEffectQuery.runtime.dispose();
  });
}

import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { HttpApiError } from "@tepirek-revamped/api/protocol/http-api-errors";
import { Layer, ManagedRuntime, References } from "effect";
import { createEffectQueryFromManagedRuntime } from "effect-query";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { FetchHttpClient, HttpClientResponse } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import * as HttpClientError from "effect/http/HttpClientError";
import type * as LayerType from "effect/Layer";
import * as Predicate from "effect/Predicate";

import { serverUrl } from "@/lib/env";

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

/** Effect HttpApi client service for the shared application API contract. */
export class AppHttpApiClient extends Context.Service<
  AppHttpApiClient,
  HttpApiClient.ForApi<typeof AppHttpApi>
>()("@tepirek-revamped/web/AppHttpApiClient") {
  /** Live browser client layer that preserves better-auth cookies. */
  static readonly layer = Layer.effect(
    AppHttpApiClient,
    HttpApiClient.make(AppHttpApi, {
      baseUrl: serverUrl,
      transformResponse: decodeUnexpectedApiError,
    })
  ).pipe(Layer.provide(fetchHttpClientLayer));
}

/** Creates Effect Query factories; the caller owns and must dispose the runtime. */
export const makeAppEffectQuery = (
  layer: LayerType.Layer<AppHttpApiClient>
) => {
  // The published alpha logs full failure causes, which may include private API data.
  // Keep errors in the Query cache for safe UI projection instead of logging them.
  const runtime = ManagedRuntime.make(
    Layer.merge(layer, Layer.succeed(References.MinimumLogLevel, "None"))
  );

  return { ...createEffectQueryFromManagedRuntime(runtime), runtime };
};

/** Application Effect Query factories and their caller-owned runtime. */
export type AppEffectQuery = ReturnType<typeof makeAppEffectQuery>;

/** Shared stateless browser API client and Effect Query factories. */
export const appEffectQuery = makeAppEffectQuery(AppHttpApiClient.layer);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void appEffectQuery.runtime.dispose();
  });
}

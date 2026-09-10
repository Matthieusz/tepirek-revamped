import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { HttpApiError } from "@tepirek-revamped/api/protocol/http-api-errors";
import { Layer } from "effect";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import type * as LayerType from "effect/Layer";
import * as Predicate from "effect/Predicate";
import { FetchHttpClient, HttpClientResponse } from "effect/unstable/http";
import * as HttpClientError from "effect/unstable/http/HttpClientError";
import { HttpApiClient } from "effect/unstable/httpapi";

import { makeEffectPromiseRunner } from "@/lib/effect-promise";
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

/**
 * Runs application API effects as Promises while preserving typed protocol
 * failures for framework-level error handling.
 */
export const runAppHttpApi = makeEffectPromiseRunner(AppHttpApiClient.layer);

/** Creates an application API Promise runner backed by a supplied layer. */
export const makeAppHttpApiRunner = (
  layer: LayerType.Layer<AppHttpApiClient>
) => makeEffectPromiseRunner(layer);

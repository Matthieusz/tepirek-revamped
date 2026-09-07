import { HealthHttpApi } from "@tepirek-revamped/api/protocol/health/http-api-contract";
import { Layer } from "effect";
import * as Context from "effect/Context";
import type * as LayerType from "effect/Layer";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

import { makeEffectPromiseRunner } from "@/lib/effect-promise";
import { serverUrl } from "@/lib/env";

const fetchRequestInitLayer = Layer.succeed(FetchHttpClient.RequestInit, {
  credentials: "include",
} satisfies RequestInit);

const fetchHttpClientLayer = FetchHttpClient.layer.pipe(
  Layer.provide(fetchRequestInitLayer)
);

/** Effect HttpApi client service for the dependency-light liveness API. */
export class HealthHttpApiClient extends Context.Service<
  HealthHttpApiClient,
  HttpApiClient.ForApi<typeof HealthHttpApi>
>()("@tepirek-revamped/web/HealthHttpApiClient") {
  /** Live browser client layer for the standalone health endpoint. */
  static readonly layer = Layer.effect(
    HealthHttpApiClient,
    HttpApiClient.make(HealthHttpApi, { baseUrl: serverUrl })
  ).pipe(Layer.provide(fetchHttpClientLayer));
}

/**
 * Runs health API effects as Promises without depending on the application
 * client or its authentication groups.
 */
export const runHealthHttpApi = makeEffectPromiseRunner(
  HealthHttpApiClient.layer
);

/** Creates a health API Promise runner backed by a supplied layer. */
export const makeHealthHttpApiRunner = (
  layer: LayerType.Layer<HealthHttpApiClient>
) => makeEffectPromiseRunner(layer);

import { HealthHttpApi } from "@tepirek-revamped/api/protocol/health/http-api-contract";
import { Layer } from "effect";
import * as Context from "effect/Context";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import type * as LayerType from "effect/Layer";

import { makeEffectQuery } from "@/lib/effect-query";
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

/** Creates health-only Effect Query factories; the caller must dispose the runtime. */
export const makeHealthEffectQuery = (
  layer: LayerType.Layer<HealthHttpApiClient>
) => makeEffectQuery(layer);

/** Module-lived stateless health transport; Query caches remain router-owned. */
export const healthEffectQuery = makeHealthEffectQuery(
  HealthHttpApiClient.layer
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void healthEffectQuery.runtime.dispose();
  });
}

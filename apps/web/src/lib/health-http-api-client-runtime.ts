import { HealthHttpApi } from "@tepirek-revamped/api/protocol/health/http-api-contract";
import { Layer, ManagedRuntime, References } from "effect";
import { createEffectQueryFromManagedRuntime } from "effect-query";
import * as Context from "effect/Context";
import { FetchHttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import type * as LayerType from "effect/Layer";

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
) => {
  // The published alpha logs full failure causes, which may include private API data.
  // Keep errors in the Query cache for safe UI projection instead of logging them.
  const runtime = ManagedRuntime.make(
    Layer.merge(layer, Layer.succeed(References.MinimumLogLevel, "None"))
  );

  return { ...createEffectQueryFromManagedRuntime(runtime), runtime };
};

/** Independent stateless health client and Effect Query factories. */
export const healthEffectQuery = makeHealthEffectQuery(
  HealthHttpApiClient.layer
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void healthEffectQuery.runtime.dispose();
  });
}

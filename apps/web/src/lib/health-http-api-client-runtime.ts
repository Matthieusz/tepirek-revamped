import { HealthHttpApi } from "@tepirek-revamped/api/protocol/health/http-api-contract";
import { Layer } from "effect";
import * as Context from "effect/Context";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import * as Atom from "effect/unstable/reactivity/Atom";

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

/** Atom runtime backed only by the standalone liveness API client. */
export const healthHttpApiRuntime = Atom.runtime(HealthHttpApiClient.layer);

import { Atom } from "@effect-atom/atom-react";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { Effect, Layer } from "effect";
import * as Context from "effect/Context";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";

import { serverUrl } from "@/lib/env";

const fetchRequestInitLayer = Layer.succeed(FetchHttpClient.RequestInit, {
  credentials: "include",
} satisfies RequestInit);

const fetchHttpClientLayer = FetchHttpClient.layer.pipe(
  Layer.provide(fetchRequestInitLayer)
);

/** Effect HttpApi client service for the shared application API contract. */
export class AppHttpApiClient extends Context.Service<
  AppHttpApiClient,
  HttpApiClient.ForApi<typeof AppHttpApi>
>()("@tepirek-revamped/web/AppHttpApiClient") {
  /** Live browser client layer that preserves better-auth cookies. */
  static readonly layer = Layer.effect(
    AppHttpApiClient,
    HttpApiClient.make(AppHttpApi, { baseUrl: serverUrl })
  ).pipe(Layer.provide(fetchHttpClientLayer));
}

/** Atom runtime backed by the live Effect HttpApi client layer. */
export const appHttpApiRuntime = Atom.runtime(AppHttpApiClient.layer);

/** Convenience helper for creating runtime-backed API atoms. */
export const appHttpApiAtom: typeof appHttpApiRuntime.atom =
  appHttpApiRuntime.atom.bind(appHttpApiRuntime);

/** Convenience helper for creating runtime-backed API mutation atoms. */
export const appHttpApiFn: typeof appHttpApiRuntime.fn =
  appHttpApiRuntime.fn.bind(appHttpApiRuntime);

/** Accessor for the typed Effect HttpApi client inside runtime-backed atoms. */
export const useAppHttpApiClient = Effect.fn("useAppHttpApiClient")(
  function* useAppHttpApiClientEffect() {
    return yield* AppHttpApiClient;
  }
);

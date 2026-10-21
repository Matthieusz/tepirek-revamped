import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { Effect, Layer } from "effect";
import { HttpClient } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { onTestFinished } from "vite-plus/test";

import type { HealthHttpApiClient } from "@/lib/health-http-api-client-runtime";
import { makeHealthEffectQuery } from "@/lib/health-http-api-client-runtime";
import {
  AppHttpApiClient,
  makeAppEffectQuery,
} from "@/lib/http-api-client-runtime";

/** Creates isolated application factories and disposes their runtime after the test. */
export const makeTestAppEffectQuery = (
  layer: Layer.Layer<AppHttpApiClient>
) => {
  const effectQuery = makeAppEffectQuery(layer);
  onTestFinished(async () => {
    await effectQuery.runtime.dispose();
  });

  return effectQuery;
};

/** Creates isolated health factories and disposes their runtime after the test. */
export const makeTestHealthEffectQuery = (
  layer: Layer.Layer<HealthHttpApiClient>
) => {
  const effectQuery = makeHealthEffectQuery(layer);
  onTestFinished(async () => {
    await effectQuery.runtime.dispose();
  });

  return effectQuery;
};

/** Fails at the real transport seam, optionally waiting for a test-controlled response. */
export const makeFailingAppEffectQuery = (
  message: string,
  before?: Promise<null>
) => {
  const httpClient = HttpClient.make(() =>
    (before === undefined
      ? Effect.void
      : Effect.promise(async () => {
          await before;
        })
    ).pipe(Effect.andThen(Effect.die(new Error(message))))
  );

  return makeTestAppEffectQuery(
    Layer.effect(
      AppHttpApiClient,
      HttpApiClient.makeWith(AppHttpApi, {
        baseUrl: "http://localhost",
        httpClient,
      })
    )
  );
};

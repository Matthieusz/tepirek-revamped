import { Effect, Layer } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { HealthHttpApi } from "../../protocol/health/http-api-contract.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";

export const AppHealthHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "health",
  (handlers) =>
    handlers.handle("healthCheck", () => Effect.succeed("OK" as const))
);

export const HealthHttpApiHandlers = HttpApiBuilder.group(
  HealthHttpApi,
  "health",
  (handlers) =>
    handlers.handle("healthCheck", () => Effect.succeed("OK" as const))
);

export const HealthHttpApiLayer = HttpApiBuilder.layer(HealthHttpApi).pipe(
  Layer.provide(HealthHttpApiHandlers)
);

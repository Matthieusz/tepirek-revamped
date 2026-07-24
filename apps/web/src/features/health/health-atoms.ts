import { Effect } from "effect";

import {
  HealthHttpApiClient,
  healthHttpApiRuntime,
} from "@/lib/health-http-api-client-runtime";

/** Resource atom for the Effect HttpApi health check. */
export const healthAtom = healthHttpApiRuntime.atom(
  Effect.gen(function* healthCheckEffect() {
    const client = yield* HealthHttpApiClient;
    return yield* client.health.healthCheck({});
  })
);

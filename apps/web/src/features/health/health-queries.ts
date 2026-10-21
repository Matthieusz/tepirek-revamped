import { Effect } from "effect";

import {
  HealthHttpApiClient,
  healthEffectQuery,
} from "@/lib/health-http-api-client-runtime";

const healthCheck = Effect.gen(function* healthCheckEffect() {
  const client = yield* HealthHttpApiClient;

  return yield* client.health.healthCheck({});
});

/** Returns the query options for the public health check. */
export const healthQueryOptions = (
  effectQuery: typeof healthEffectQuery = healthEffectQuery
) =>
  effectQuery.queryOptions({
    queryFn: () => healthCheck,
    queryKey: ["health"],
  });

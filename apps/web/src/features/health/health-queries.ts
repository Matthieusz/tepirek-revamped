import { queryOptions } from "@tanstack/react-query";
import { Effect } from "effect";

import {
  HealthHttpApiClient,
  runHealthHttpApi,
} from "@/lib/health-http-api-client-runtime";

const healthCheck = Effect.gen(function* healthCheckEffect() {
  const client = yield* HealthHttpApiClient;

  return yield* client.health.healthCheck({});
});

/** Returns the query options for the public health check. */
export const healthQueryOptions = (
  runner: typeof runHealthHttpApi = runHealthHttpApi
) =>
  queryOptions({
    queryFn: async ({ signal }) => await runner(healthCheck, { signal }),
    queryKey: ["health"],
  });

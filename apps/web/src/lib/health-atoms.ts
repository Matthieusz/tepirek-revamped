import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
} from "@/lib/http-api-client-runtime";

/** Resource atom for the Effect HttpApi health check. */
export const healthAtom = appHttpApiAtom(
  Effect.gen(function* healthCheckEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.health.healthCheck({});
  })
);

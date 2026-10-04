import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import * as Schema from "effect/Schema";

export const HealthHttpApiGroup = HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("healthCheck", "/health", {
    success: Schema.Literal("OK"),
  })
);

export const HealthHttpApi = HttpApi.make("healthApi").add(HealthHttpApiGroup);

export type HealthHttpApi = typeof HealthHttpApi;

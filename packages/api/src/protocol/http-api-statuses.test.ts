import type { HttpApiEndpoint } from "effect/http-api";
import { expect, it } from "vite-plus/test";

import { AppHttpApi } from "./http-api-contract.ts";

it("registers each error status separately instead of collapsing unions to 500", () => {
  for (const [groupName, expectedStatuses] of [
    ["announcement", [401, 403, 500]],
    ["auction", [401, 403, 404, 409, 500]],
    ["bet", [400, 401, 403, 404, 500]],
    ["event", [401, 403, 500]],
    ["heroes", [401, 403, 500]],
    ["legendPricing", [400, 401, 403, 404, 409, 500]],
    ["ranking", [401, 403, 404, 500]],
    ["skills", [400, 401, 403, 409, 500]],
    ["todo", [401, 403, 500]],
    ["user", [400, 401, 403, 404, 500]],
    ["vault", [400, 401, 403, 404, 500]],
  ] as const) {
    for (const endpoint of Object.values<HttpApiEndpoint.Top>(
      AppHttpApi.groups[groupName].endpoints
    )) {
      const statuses = new Set(
        Array.from(
          endpoint.error,
          (schema) => schema.ast.annotations?.httpApiStatus
        )
      );

      expect(statuses, `${groupName}.${endpoint.identifier}`).toEqual(
        new Set(expectedStatuses)
      );
    }
  }
});

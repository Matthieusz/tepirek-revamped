import { OpenApi } from "effect/unstable/httpapi";
import { describe, expect, it } from "vitest";

import { AppHttpApi } from "./http-api-contract.js";

type OpenApiDocument = ReturnType<typeof OpenApi.fromApi>;
type OpenApiPath = keyof OpenApiDocument["paths"];
type HttpMethod = keyof OpenApiDocument["paths"][OpenApiPath];

const appOpenApi = OpenApi.fromApi(AppHttpApi);

const expectRoute = (method: HttpMethod, path: OpenApiPath) => {
  expect(appOpenApi.paths[path]?.[method]).toBeDefined();
};

describe("AppHttpApi route contract", () => {
  it("exposes the migrated bet routes", () => {
    expectRoute("post", "/bet");
    expectRoute("post", "/bet/delete");
    expectRoute("post", "/bet/edit");
    expectRoute("get", "/bet");
    expectRoute("post", "/bet/paginated");
    expectRoute("post", "/bet/members");
    expectRoute("post", "/bet/by-event");
    expectRoute("get", "/bet/latest-for-copy");
  });

  it("exposes the migrated ranking routes", () => {
    expectRoute("post", "/ranking/hero-stats");
    expectRoute("get", "/ranking/oldest-unpaid-event");
    expectRoute("post", "/ranking");
  });

  it("exposes the migrated user routes", () => {
    expectRoute("post", "/user/delete");
    expectRoute("get", "/user/session");
    expectRoute("get", "/user/verified");
    expectRoute("get", "/user");
    expectRoute("post", "/user/set-role");
    expectRoute("post", "/user/set-verified");
    expectRoute("post", "/user/profile");
    expectRoute("post", "/user/name");
    expectRoute("post", "/user/verify-discord-guild-membership");
  });

  it("exposes the migrated vault routes", () => {
    expectRoute("post", "/vault/distribute-gold");
    expectRoute("post", "/vault/user-stats");
    expectRoute("post", "/vault");
    expectRoute("post", "/vault/toggle-paid-out");
  });
});

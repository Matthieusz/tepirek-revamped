import * as Record from "effect/Record";
import { OpenApi } from "effect/unstable/httpapi";
import { describe, expect, it } from "vitest";

import { HealthHttpApi } from "./protocol/health/http-api-contract.ts";
import { AppHttpApi } from "./protocol/http-api-contract.ts";

type OpenApiDocument = ReturnType<typeof OpenApi.fromApi>;
type OpenApiPath = keyof OpenApiDocument["paths"];
type HttpMethod = keyof OpenApiDocument["paths"][OpenApiPath];

const appOpenApi = OpenApi.fromApi(AppHttpApi);
const healthOpenApi = OpenApi.fromApi(HealthHttpApi);

const expectRoute = (method: HttpMethod, path: OpenApiPath) => {
  expect(appOpenApi.paths[path]?.[method]).toBeDefined();
};

const expectPostResponseStatuses = (
  path: OpenApiPath,
  expectedStatuses: readonly string[]
) => {
  const statuses = Record.keys(appOpenApi.paths[path]?.post?.responses ?? {});

  expect(statuses).toEqual(expect.arrayContaining([...expectedStatuses]));
  expect(statuses).not.toContain("500");
};

describe("AppHttpApi route contract", () => {
  it("keeps liveness in its dependency-light standalone API", () => {
    expect(appOpenApi.paths["/health"]).toBeUndefined();
    expect(healthOpenApi.paths["/health"]?.get).toBeDefined();
    expect(Record.keys(healthOpenApi.paths)).toEqual(["/health"]);
  });

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

  it("preserves squad-builder endpoint error statuses", () => {
    expectPostResponseStatuses("/squad-builder/squad-groups", [
      "200",
      "400",
      "401",
      "403",
      "404",
      "409",
      "502",
      "503",
    ]);
    expectPostResponseStatuses(
      "/squad-builder/account-sharing/invite-targets/search",
      ["200", "400", "401", "403", "404", "409", "503"]
    );
    expectPostResponseStatuses("/squad-builder/account-imports/owned", [
      "200",
      "400",
      "401",
      "403",
      "404",
      "409",
      "502",
      "503",
    ]);
    expectPostResponseStatuses("/squad-builder/account-refetches/preview", [
      "200",
      "400",
      "401",
      "403",
      "404",
      "409",
      "502",
      "503",
    ]);
    expectPostResponseStatuses(
      "/squad-builder/squad-group-sharing/shared-groups",
      ["200", "400", "401", "403", "404", "409", "503"]
    );
  });
});

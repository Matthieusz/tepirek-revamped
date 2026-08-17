import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import { OpenApi } from "effect/unstable/httpapi";
import { describe, expect, it } from "vitest";

import { HealthHttpApi } from "./protocol/health/http-api-contract.ts";
import { HeroSummary } from "./protocol/heroes/http-api-contract.ts";
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

  expect(statuses).toEqual(expectedStatuses);
};

describe("AppHttpApi route contract", () => {
  it("keeps hero names non-empty for image alternative text", () => {
    const hero = {
      eventId: 1,
      id: 1,
      image: null,
      level: 1,
      name: "",
      pointWorth: "0",
    };

    expect(() => Schema.decodeSync(HeroSummary)(hero)).toThrow();
    expect(
      Schema.decodeSync(HeroSummary)({ ...hero, name: "Wojownik" })
    ).toMatchObject({ name: "Wojownik" });
  });

  it("keeps liveness in its dependency-light standalone API", () => {
    expect(appOpenApi.paths["/health"]).toBeUndefined();
    expect(healthOpenApi.paths["/health"]?.get).toBeDefined();
    expect(Record.keys(healthOpenApi.paths)).toEqual(["/health"]);
  });

  it("exposes the bet routes", () => {
    expectRoute("post", "/bet");
    expectRoute("post", "/bet/delete");
    expectRoute("post", "/bet/edit");
    expectRoute("get", "/bet");
    expectRoute("post", "/bet/paginated");
    expectRoute("post", "/bet/members");
    expectRoute("post", "/bet/by-event");
    expectRoute("get", "/bet/latest-for-copy");
  });

  it("exposes the ranking routes", () => {
    expectRoute("post", "/ranking/hero-stats");
    expectRoute("get", "/ranking/oldest-unpaid-event");
    expectRoute("post", "/ranking");
  });

  it("exposes the user routes", () => {
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

  it("exposes the vault routes", () => {
    expectRoute("post", "/vault/distribute-gold");
    expectRoute("post", "/vault");
    expectRoute("post", "/vault/toggle-paid-out");
  });

  it("exposes only reachable squad-builder error statuses", () => {
    const endpointStatuses = [
      ["/squad-builder/squad-groups", ["200", "400", "401", "403", "503"]],
      ["/squad-builder/squad-groups/owned", ["200", "401", "403", "503"]],
      [
        "/squad-builder/squad-groups/delete",
        ["200", "401", "403", "404", "503"],
      ],
      [
        "/squad-builder/squad-groups/global",
        ["200", "400", "401", "403", "503"],
      ],
      [
        "/squad-builder/squad-groups/detail",
        ["200", "401", "403", "404", "503"],
      ],
      [
        "/squad-builder/squad-groups/characters",
        ["200", "401", "403", "404", "503"],
      ],
      [
        "/squad-builder/squad-groups/save",
        ["200", "400", "401", "403", "404", "409", "503"],
      ],
      [
        "/squad-builder/squad-groups/save-shared",
        ["200", "400", "401", "403", "404", "409", "503"],
      ],
      [
        "/squad-builder/squad-groups/visibility",
        ["200", "401", "403", "404", "503"],
      ],
      [
        "/squad-builder/account-imports/preview-profile",
        ["200", "400", "401", "403", "409", "502", "503"],
      ],
      [
        "/squad-builder/account-imports/preview-owned",
        ["200", "400", "401", "403", "503"],
      ],
      [
        "/squad-builder/account-imports/confirm-owned",
        ["200", "400", "401", "403", "404", "409", "503"],
      ],
      [
        "/squad-builder/account-imports/rename-owned",
        ["200", "400", "401", "403", "404", "503"],
      ],
      [
        "/squad-builder/account-imports/delete-owned",
        ["200", "401", "403", "404", "503"],
      ],
      ["/squad-builder/account-imports/owned", ["200", "401", "403", "503"]],
      [
        "/squad-builder/account-refetches/preview",
        ["200", "400", "401", "403", "404", "502", "503"],
      ],
      [
        "/squad-builder/account-refetches/apply",
        ["200", "401", "403", "404", "503"],
      ],
      [
        "/squad-builder/account-sharing/invite-targets/search",
        ["200", "400", "401", "403", "404", "503"],
      ],
      [
        "/squad-builder/account-sharing/invites",
        ["200", "400", "401", "403", "404", "409", "503"],
      ],
      [
        "/squad-builder/account-sharing/invites/respond",
        ["200", "401", "403", "404", "409", "503"],
      ],
      [
        "/squad-builder/account-sharing/access/revoke",
        ["200", "401", "403", "404", "409", "503"],
      ],
      [
        "/squad-builder/account-sharing/incoming-invites",
        ["200", "401", "403", "503"],
      ],
      [
        "/squad-builder/account-sharing/shared-accounts",
        ["200", "401", "403", "503"],
      ],
      [
        "/squad-builder/account-sharing/access-grants",
        ["200", "401", "403", "404", "503"],
      ],
      [
        "/squad-builder/squad-group-sharing/editor-targets/search",
        ["200", "400", "401", "403", "404", "503"],
      ],
      [
        "/squad-builder/squad-group-sharing/editor-invites",
        ["200", "400", "401", "403", "404", "409", "503"],
      ],
      [
        "/squad-builder/squad-group-sharing/editor-invites/respond",
        ["200", "401", "403", "404", "409", "503"],
      ],
      [
        "/squad-builder/squad-group-sharing/editors/revoke",
        ["200", "401", "403", "404", "409", "503"],
      ],
      [
        "/squad-builder/squad-group-sharing/incoming-invites",
        ["200", "401", "403", "503"],
      ],
      [
        "/squad-builder/squad-group-sharing/shared-groups",
        ["200", "401", "403", "503"],
      ],
      [
        "/squad-builder/squad-group-sharing/editor-grants",
        ["200", "401", "403", "404", "503"],
      ],
      [
        "/squad-builder/squad-group-sharing/pending-invite-count",
        ["200", "401", "403", "503"],
      ],
    ] as const;

    for (const [path, statuses] of endpointStatuses) {
      expectPostResponseStatuses(path, statuses);
    }
  });
});

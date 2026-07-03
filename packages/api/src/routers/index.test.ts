import { OpenApi } from "effect/unstable/httpapi";
import { describe, expect, it } from "vitest";

import { AppHttpApi } from "../http-api-contract.js";

describe("app HttpApi", () => {
  it("exposes a public health check", () => {
    const document = OpenApi.fromApi(AppHttpApi);

    expect(document.paths).toHaveProperty("/health");
  });
});

import { createRouterClient } from "@orpc/server";
import { describe, expect, it } from "vitest";

import { appRouter } from ".";
import type { RouterContext } from "./procedures";

describe("app router", () => {
  it("exposes a public health check", async () => {
    const client = createRouterClient(appRouter, {
      context: {
        logger: {} as RouterContext["logger"],
        session: null,
      } as RouterContext,
    });

    await expect(client.healthCheck()).resolves.toBe("OK");
  });
});

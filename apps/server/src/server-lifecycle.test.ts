import { describe, expect, it } from "vitest";

import { makeShutdown } from "./server-lifecycle.js";

describe("server lifecycle", () => {
  it("awaits every finalizer and runs each one exactly once", async () => {
    const calls: string[] = [];
    const shutdown = makeShutdown([
      {
        dispose: async () => {
          await Promise.resolve();
          calls.push("app-http-api");
        },
      },
      {
        dispose: async () => {
          await Promise.resolve();
          calls.push("health-http-api");
        },
      },
      {
        dispose: async () => {
          await Promise.resolve();
          calls.push("database-pool");
        },
      },
    ]);

    const firstShutdown = shutdown();
    const secondShutdown = shutdown();

    expect(secondShutdown).toBe(firstShutdown);
    await firstShutdown;
    expect(calls.toSorted()).toEqual([
      "app-http-api",
      "database-pool",
      "health-http-api",
    ]);
  });
});

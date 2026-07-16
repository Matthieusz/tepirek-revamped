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

  it("awaits every finalizer before reporting disposal failures", async () => {
    const calls: string[] = [];
    const failure = new Error("app disposal failed");
    const shutdown = makeShutdown([
      {
        dispose: () => Promise.reject(failure),
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

    await expect(shutdown()).rejects.toEqual(
      new AggregateError([failure], "Failed to dispose server resources")
    );
    expect(calls.toSorted()).toEqual(["database-pool", "health-http-api"]);
  });
});

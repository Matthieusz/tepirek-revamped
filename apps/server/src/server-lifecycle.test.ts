import { describe, expect, it } from "vitest";

import { makeShutdown, stopServer } from "./server-lifecycle.js";

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

  it("runs resource finalizers when stopping the server fails", async () => {
    const calls: string[] = [];
    const stopFailure = new Error("server stop failed");
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

    await expect(
      stopServer({ stop: () => Promise.reject(stopFailure) }, shutdown)
    ).rejects.toEqual(
      new AggregateError([stopFailure], "Failed to stop server cleanly")
    );
    expect(calls.toSorted()).toEqual([
      "app-http-api",
      "database-pool",
      "health-http-api",
    ]);
  });

  it("preserves server stop and resource disposal failures", async () => {
    const stopFailure = new Error("server stop failed");
    const disposalFailure = new Error("resource disposal failed");
    const shutdown = makeShutdown([
      { dispose: () => Promise.reject(disposalFailure) },
    ]);

    await expect(
      stopServer({ stop: () => Promise.reject(stopFailure) }, shutdown)
    ).rejects.toEqual(
      new AggregateError(
        [
          stopFailure,
          new AggregateError(
            [disposalFailure],
            "Failed to dispose server resources"
          ),
        ],
        "Failed to stop server cleanly"
      )
    );
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

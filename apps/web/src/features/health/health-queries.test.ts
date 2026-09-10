import { dehydrate, hydrate } from "@tanstack/react-query";
import { HealthHttpApi } from "@tepirek-revamped/api/protocol/health/http-api-contract";
import { Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { describe, expect, it } from "vitest";

import {
  HealthHttpApiClient,
  makeHealthHttpApiRunner,
} from "@/lib/health-http-api-client-runtime";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";
import { loadHealth } from "@/routes/index";

import { healthQueryOptions } from "./health-queries";

interface HealthResponse {
  readonly body: unknown;
  readonly status?: number;
}

const makeHealthRunner = (responses: readonly HealthResponse[]) => {
  let calls = 0;

  const httpClient = HttpClient.make((request) => {
    const response = responses[Math.min(calls, responses.length - 1)];
    calls += 1;

    if (response === undefined) {
      return Effect.die(new Error("No health response configured"));
    }

    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        Response.json(response.body, { status: response.status ?? 200 })
      )
    );
  });

  const client = HttpApiClient.makeWith(HealthHttpApi, {
    baseUrl: "http://localhost",
    httpClient,
  });

  return {
    calls: () => calls,
    runner: makeHealthHttpApiRunner(Layer.effect(HealthHttpApiClient, client)),
  };
};

const makeHealthResponse = (status = 200): HealthResponse => ({
  body: "OK",
  status,
});

describe("health query", () => {
  it("deduplicates concurrent consumers through the shared query key", async () => {
    const health = makeHealthRunner([makeHealthResponse()]);
    const testClient = makeTestQueryClient();

    try {
      const query = healthQueryOptions(health.runner);

      const results = await Promise.all([
        testClient.queryClient.query(query),
        testClient.queryClient.query(query),
      ]);

      expect(results).toEqual(["OK", "OK"]);
      expect(health.calls()).toBe(1);
    } finally {
      testClient.cleanup();
    }
  });

  it("lets a failed route loader retry without turning failure into data", async () => {
    const health = makeHealthRunner([
      makeHealthResponse(503),
      makeHealthResponse(),
    ]);

    const testClient = makeTestQueryClient();
    const query = { ...healthQueryOptions(health.runner), retry: false };

    try {
      await expect(
        loadHealth(testClient.queryClient, query)
      ).rejects.toBeDefined();
      await expect(
        loadHealth(testClient.queryClient, query)
      ).resolves.toBeUndefined();
      expect(health.calls()).toBe(2);
    } finally {
      testClient.cleanup();
    }
  });

  it("uses dehydrated health data without a redundant request after hydration", async () => {
    const health = makeHealthRunner([makeHealthResponse()]);
    const serverClient = makeTestQueryClient();
    const browserClient = makeTestQueryClient();

    try {
      await serverClient.queryClient.query(healthQueryOptions(health.runner));
      const dehydrated = dehydrate(serverClient.queryClient);
      const serialized = JSON.stringify(dehydrated);

      expect(serialized).not.toContain("HealthHttpApiClient");
      hydrate(browserClient.queryClient, dehydrated);

      await loadHealth(
        browserClient.queryClient,
        healthQueryOptions(health.runner)
      );

      expect(health.calls()).toBe(1);
    } finally {
      serverClient.cleanup();
      browserClient.cleanup();
    }
  });

  it("refreshes an invalidated health query in the route loader", async () => {
    const health = makeHealthRunner([
      makeHealthResponse(),
      makeHealthResponse(),
    ]);

    const testClient = makeTestQueryClient();

    try {
      await loadHealth(
        testClient.queryClient,
        healthQueryOptions(health.runner)
      );
      await testClient.queryClient.invalidateQueries({ queryKey: ["health"] });
      await loadHealth(
        testClient.queryClient,
        healthQueryOptions(health.runner)
      );

      expect(health.calls()).toBe(2);
    } finally {
      testClient.cleanup();
    }
  });
});

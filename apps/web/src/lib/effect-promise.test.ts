import { HealthHttpApi } from "@tepirek-revamped/api/protocol/health/http-api-contract";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { TodoForbidden } from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import { Effect } from "effect";
import * as Layer from "effect/Layer";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getErrorMessage } from "@/lib/errors";
import {
  HealthHttpApiClient,
  makeHealthHttpApiRunner,
} from "@/lib/health-http-api-client-runtime";
import {
  AppHttpApiClient,
  makeAppHttpApiRunner,
  runAppHttpApi,
} from "@/lib/http-api-client-runtime";

type AppHttpApiEffect<A, E = never> = Effect.Effect<A, E, AppHttpApiClient>;

const listTodos = Effect.gen(function* listTodosEffect() {
  const client = yield* AppHttpApiClient;

  return yield* client.todo.listTodos({});
});

const makeAppLayer = (response: Response) => {
  const httpClient = HttpClient.make((request) =>
    Effect.succeed(HttpClientResponse.fromWeb(request, response))
  );

  const client = HttpApiClient.makeWith(AppHttpApi, {
    baseUrl: "http://localhost",
    httpClient,
  });

  return Layer.effect(AppHttpApiClient, client);
};

type JsonResponseBody = Parameters<typeof Response.json>[0];

const jsonResponse = (body: JsonResponseBody, status = 200): Response =>
  Response.json(body, { status });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Effect Promise boundary", () => {
  it("returns decoded API data and sends cookies with the live client", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse([
          {
            completed: false,
            id: 1,
            text: "first",
            userId: "user-1",
          },
        ])
      )
      .mockResolvedValue(
        jsonResponse(
          new TodoForbidden({ message: "internal permission details" }),
          403
        )
      );

    const result = await runAppHttpApi(listTodos);

    expect(result).toEqual([
      {
        completed: false,
        id: 1,
        text: "first",
        userId: "user-1",
      },
    ]);
    let protocolError: unknown;

    try {
      await runAppHttpApi(listTodos);
    } catch (caughtError) {
      protocolError = caughtError;
    }

    expect(protocolError).toHaveProperty("_tag", "TodoForbidden");
    expect(protocolError).toHaveProperty(
      "message",
      "internal permission details"
    );
    expect(getErrorMessage(protocolError)).toBe(
      "Nie masz uprawnień do wykonania tej akcji."
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toEqual(new URL("http://localhost:3000/todos"));
    expect(init?.credentials).toBe("include");
  });

  it("preserves typed Effect failures at the Promise boundary", async () => {
    const runner = makeAppHttpApiRunner(makeAppLayer(jsonResponse([])));

    const protocolError = new TodoForbidden({
      message: "internal permission details",
    });

    const protocolFailure = Effect.fail(protocolError);

    let error: unknown;

    try {
      await runner(protocolFailure);
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBe(protocolError);
    expect(getErrorMessage(error)).toBe(
      "Nie masz uprawnień do wykonania tej akcji."
    );
  });

  it("rejects malformed successful responses instead of returning empty data", async () => {
    const runner = makeAppHttpApiRunner(makeAppLayer(jsonResponse({})));

    await expect(runner(listTodos)).rejects.toBeDefined();
  });

  it("rejects defects without wrapping them in FiberFailure", async () => {
    const runner = makeAppHttpApiRunner(makeAppLayer(jsonResponse([])));
    const defect = new Error("database credentials");

    const defectEffect: AppHttpApiEffect<never> = Effect.die(defect);

    await expect(runner(defectEffect)).rejects.toBe(defect);
  });

  it("interrupts the injected transport when its signal is aborted", async () => {
    let started = false;

    const httpClient = HttpClient.make(() => {
      started = true;

      return Effect.never;
    });

    const client = HttpApiClient.makeWith(AppHttpApi, {
      baseUrl: "http://localhost",
      httpClient,
    });

    const runner = makeAppHttpApiRunner(Layer.effect(AppHttpApiClient, client));
    const controller = new AbortController();
    const request = runner(listTodos, { signal: controller.signal });

    await vi.waitFor(() => {
      expect(started).toBe(true);
    });
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });

  it("runs health with only the health client layer", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(request, jsonResponse("OK")))
    );

    const client = HttpApiClient.makeWith(HealthHttpApi, {
      baseUrl: "http://localhost",
      httpClient,
    });

    const runner = makeHealthHttpApiRunner(
      Layer.effect(HealthHttpApiClient, client)
    );

    const healthCheck = Effect.gen(function* healthCheckEffect() {
      const healthClient = yield* HealthHttpApiClient;

      return yield* healthClient.health.healthCheck({});
    });

    await expect(runner(healthCheck)).resolves.toBe("OK");
  });
});

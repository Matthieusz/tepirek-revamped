import { CancelledError } from "@tanstack/react-query";
import { HealthHttpApi } from "@tepirek-revamped/api/protocol/health/http-api-contract";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { TodoForbidden } from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import { Deferred, Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { healthQueryOptions } from "@/features/health/health-queries";
import { listTodos } from "@/features/todos/todo-api";
import { EffectQueryDefect, EffectQueryFailure } from "@/lib/effect-query";
import { getErrorMessage } from "@/lib/errors";
import { HealthHttpApiClient } from "@/lib/health-http-api-client-runtime";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import {
  makeTestAppEffectQuery,
  makeTestHealthEffectQuery,
} from "@/lib/test-utils/effect-query-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

const makeAppLayer = (response: Response) =>
  Layer.effect(
    AppHttpApiClient,
    HttpApiClient.makeWith(AppHttpApi, {
      baseUrl: "http://localhost",
      httpClient: HttpClient.make((request) =>
        Effect.succeed(HttpClientResponse.fromWeb(request, response))
      ),
    })
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Effect Query integration", () => {
  it("decodes live responses, sends cookies, and projects wrapped protocol errors safely", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValue(
        Response.json(
          new TodoForbidden({ message: "internal permission details" }),
          { status: 403 }
        )
      );

    const eq = makeTestAppEffectQuery(AppHttpApiClient.layer);
    const client = makeTestQueryClient();

    try {
      await expect(
        client.queryClient.query(
          eq.queryOptions({
            queryFn: listTodos,
            queryKey: ["live-todos"],
          })
        )
      ).resolves.toEqual([]);
      await expect(
        client.queryClient.query(
          eq.queryOptions({
            queryFn: listTodos,
            queryKey: ["forbidden-todos"],
            retry: false,
          })
        )
      ).rejects.toBeInstanceOf(EffectQueryFailure);

      const error = client.queryClient.getQueryState([
        "forbidden-todos",
      ])?.error;

      expect(error).toHaveProperty("failure._tag", "TodoForbidden");
      expect(getErrorMessage(error)).toBe(
        "Nie masz uprawnień do wykonania tej akcji."
      );
      expect(fetch.mock.calls[0]?.[1]?.credentials).toBe("include");
    } finally {
      client.cleanup();
    }
  });

  it("retains typed failures for matching without displaying diagnostic messages", async () => {
    const eq = makeTestAppEffectQuery(makeAppLayer(Response.json([])));
    const client = makeTestQueryClient();
    const failure = new TodoForbidden({ message: "private details" });

    try {
      await expect(
        client.queryClient.query(
          eq.queryOptions({
            queryFn: () => Effect.fail(failure),
            queryKey: ["failure"],
            retry: false,
          })
        )
      ).rejects.toMatchObject({ failure });
      const error = client.queryClient.getQueryState(["failure"])?.error;
      expect(error).toBeInstanceOf(EffectQueryFailure);

      if (error instanceof EffectQueryFailure) {
        expect(
          error.match({
            OrElse: () => "defect",
            TodoForbidden: () => "forbidden",
          })
        ).toBe("forbidden");
      }

      expect(getErrorMessage(error)).toBe(
        "Nie masz uprawnień do wykonania tej akcji."
      );
    } finally {
      client.cleanup();
    }
  });

  it("rejects malformed successful responses", async () => {
    const eq = makeTestAppEffectQuery(makeAppLayer(Response.json({})));
    const client = makeTestQueryClient();

    try {
      await expect(
        client.queryClient.query(
          eq.queryOptions({
            queryFn: listTodos,
            queryKey: ["malformed"],
            retry: false,
          })
        )
      ).rejects.toBeInstanceOf(EffectQueryFailure);
    } finally {
      client.cleanup();
    }
  });

  it("keeps defects out of user-facing copy", async () => {
    const eq = makeTestAppEffectQuery(makeAppLayer(Response.json([])));
    const client = makeTestQueryClient();

    try {
      await expect(
        client.queryClient.query(
          eq.queryOptions({
            queryFn: () => Effect.die(new Error("database credentials")),
            queryKey: ["defect"],
            retry: false,
          })
        )
      ).rejects.toBeInstanceOf(EffectQueryDefect);
      expect(
        getErrorMessage(
          client.queryClient.getQueryState(["defect"])?.error,
          "Safe fallback"
        )
      ).toBe("Safe fallback");
    } finally {
      client.cleanup();
    }
  });

  it("interrupts the transport and runs finalizers when Query cancels a read", async () => {
    const started = Deferred.makeUnsafe<boolean>();
    const finalized = Deferred.makeUnsafe<boolean>();

    const httpClient = HttpClient.make(() =>
      Deferred.succeed(started, true).pipe(
        Effect.andThen(Effect.never),
        Effect.ensuring(Deferred.succeed(finalized, true))
      )
    );

    const eq = makeTestAppEffectQuery(
      Layer.effect(
        AppHttpApiClient,
        HttpApiClient.makeWith(AppHttpApi, {
          baseUrl: "http://localhost",
          httpClient,
        })
      )
    );

    const client = makeTestQueryClient();

    try {
      const request = client.queryClient.query(
        eq.queryOptions({ queryFn: listTodos, queryKey: ["cancel"] })
      );

      const cancelled = expect(request).rejects.toBeInstanceOf(CancelledError);
      await Effect.runPromise(Deferred.await(started));
      await client.queryClient.cancelQueries({ queryKey: ["cancel"] });
      await Effect.runPromise(Deferred.await(finalized));
      await cancelled;
      expect(client.queryClient.getQueryData(["cancel"])).toBeUndefined();
      expect(client.queryClient.getQueryState(["cancel"])?.fetchStatus).toBe(
        "idle"
      );
    } finally {
      client.cleanup();
    }
  });

  it("aborts the live fetch signal when Query cancels a read", async () => {
    const started = Deferred.makeUnsafe<AbortSignal>();

    const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
      const signal = init?.signal;

      if (signal === undefined || signal === null) {
        throw new Error("Expected an interruptible fetch");
      }

      Effect.runSync(Deferred.succeed(started, signal));

      return await Effect.runPromise(Effect.never, { signal });
    });

    const eq = makeTestAppEffectQuery(
      AppHttpApiClient.layer.pipe(
        Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fetch))
      )
    );

    const client = makeTestQueryClient();

    try {
      const request = client.queryClient.query(
        eq.queryOptions({
          queryFn: listTodos,
          queryKey: ["fetch-abort"],
          retry: false,
        })
      );

      const cancelled = expect(request).rejects.toBeInstanceOf(CancelledError);
      const signal = await Effect.runPromise(Deferred.await(started));
      expect(signal.aborted).toBe(false);

      await client.queryClient.cancelQueries({ queryKey: ["fetch-abort"] });
      await cancelled;
      expect(signal.aborted).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(
        client.queryClient.getQueryState(["fetch-abort"])?.error
      ).toBeNull();
    } finally {
      client.cleanup();
    }
  });

  it("shares layer acquisition and releases it when its owner disposes the runtime", async () => {
    let acquired = 0;
    let released = 0;

    const httpClient = HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(request, Response.json([])))
    );

    const layer = Layer.effect(
      AppHttpApiClient,
      Effect.acquireRelease(
        HttpApiClient.makeWith(AppHttpApi, {
          baseUrl: "http://localhost",
          httpClient,
        }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              acquired += 1;
            })
          )
        ),
        () =>
          Effect.sync(() => {
            released += 1;
          })
      )
    );

    const eq = makeTestAppEffectQuery(layer);
    const client = makeTestQueryClient();

    try {
      await client.queryClient.query(
        eq.queryOptions({ queryFn: listTodos, queryKey: ["first"] })
      );
      await client.queryClient.query(
        eq.queryOptions({ queryFn: listTodos, queryKey: ["second"] })
      );
      expect(acquired).toBe(1);
      expect(released).toBe(0);
      await eq.runtime.dispose();
      await eq.runtime.dispose();
      expect(released).toBe(1);
      await expect(
        client.queryClient.query(
          eq.queryOptions({
            queryFn: listTodos,
            queryKey: ["after-disposal"],
            retry: false,
          })
        )
      ).rejects.toBeDefined();
      expect(acquired).toBe(1);
      expect(released).toBe(1);
    } finally {
      client.cleanup();
    }
  });

  it("interrupts in-flight reads and awaits their finalizers on runtime disposal", async () => {
    const started = Deferred.makeUnsafe<boolean>();
    const finalized = Deferred.makeUnsafe<boolean>();

    const httpClient = HttpClient.make(() =>
      Deferred.succeed(started, true).pipe(
        Effect.andThen(Effect.never),
        Effect.ensuring(Deferred.succeed(finalized, true))
      )
    );

    const eq = makeTestAppEffectQuery(
      Layer.effect(
        AppHttpApiClient,
        HttpApiClient.makeWith(AppHttpApi, {
          baseUrl: "http://localhost",
          httpClient,
        })
      )
    );

    const client = makeTestQueryClient();

    try {
      const request = client.queryClient.query(
        eq.queryOptions({
          queryFn: listTodos,
          queryKey: ["dispose-pending"],
          retry: false,
        })
      );

      // Runtime interruption is a bridge defect; only Query cancellation produces CancelledError.
      const interrupted =
        expect(request).rejects.toBeInstanceOf(EffectQueryDefect);

      await Effect.runPromise(Deferred.await(started));
      await eq.runtime.dispose();
      expect(Effect.runSync(Deferred.isDone(finalized))).toBe(true);
      await interrupted;
      expect(
        client.queryClient.getQueryData(["dispose-pending"])
      ).toBeUndefined();
      expect(
        client.queryClient.getQueryState(["dispose-pending"])?.fetchStatus
      ).toBe("idle");
    } finally {
      client.cleanup();
    }
  });

  it("runs health with only the health client layer", async () => {
    const httpClient = HttpClient.make((request) =>
      Effect.succeed(HttpClientResponse.fromWeb(request, Response.json("OK")))
    );

    const eq = makeTestHealthEffectQuery(
      Layer.effect(
        HealthHttpApiClient,
        HttpApiClient.makeWith(HealthHttpApi, {
          baseUrl: "http://localhost",
          httpClient,
        })
      )
    );

    const client = makeTestQueryClient();

    try {
      await expect(
        client.queryClient.query(healthQueryOptions(eq))
      ).resolves.toBe("OK");
    } finally {
      client.cleanup();
    }
  });
});

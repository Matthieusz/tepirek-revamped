import {
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderRateLimited,
  SquadBuilderUpstreamUnavailable,
} from "@tepirek-revamped/api/protocol/squad-builder/errors";
import { Cause, Effect, Layer } from "effect";
import { EffectQueryDefect, EffectQueryFailure } from "effect-query";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import {
  HttpClientError,
  TransportError,
  DecodeError,
  EncodeError,
  StatusCodeError,
} from "effect/http/HttpClientError";
import { describe, expect, it, onTestFinished, vi } from "vite-plus/test";

import { getSquadGroupDetail } from "@/features/squad-builder/squad-group-api";
import {
  AppHttpApiClient,
  makeAppHttpApiClient,
} from "@/lib/http-api-client-runtime";
import { createQueryClient } from "@/lib/query-client";
import type { QueryDiagnostic } from "@/lib/query-diagnostics";
import { queryRetryDelay, shouldRetryQuery } from "@/lib/query-failure-policy";
import { makeTestAppEffectQuery } from "@/lib/test-utils/effect-query-test-utils";

const wrapped = <E extends { readonly _tag: string }>(failure: E) =>
  new EffectQueryFailure("private cause", failure, Cause.fail(failure));

const makeTransport = (response: () => Response) => {
  let attempts = 0;

  const httpClient = HttpClient.make((request) =>
    Effect.sync(() => {
      attempts += 1;

      return HttpClientResponse.fromWeb(request, response());
    })
  );

  const eq = makeTestAppEffectQuery(
    Layer.effect(
      AppHttpApiClient,
      makeAppHttpApiClient.pipe(
        Effect.provideService(HttpClient.HttpClient, httpClient)
      )
    )
  );

  const diagnostics: QueryDiagnostic[] = [];

  const client = createQueryClient((record) => {
    diagnostics.push(record);
  });

  onTestFinished(() => {
    client.clear();
  });

  return { attempts: () => attempts, client, diagnostics, eq };
};

const request = HttpClientRequest.get("https://private.example/?token=secret");

describe("query failure policy", () => {
  it.each([
    new SquadBuilderUnauthorized({ message: "secret" }),
    new SquadBuilderForbidden({ message: "secret" }),
    new SquadBuilderInvalidInput({ message: "secret" }),
    new SquadBuilderNotFound({ message: "secret" }),
    new SquadBuilderConflict({ message: "secret" }),
    new SquadBuilderRateLimited({ message: "monthly budget exhausted" }),
  ])("does not retry $_tag failures", async (failure) => {
    const transport = makeTransport(() =>
      Response.json(failure, { status: 400 })
    );

    await expect(
      transport.client.query(
        transport.eq.queryOptions({
          queryFn: () => Effect.fail(failure),
          queryKey: ["terminal", failure._tag],
        })
      )
    ).rejects.toBeInstanceOf(EffectQueryFailure);
    expect(shouldRetryQuery(0, wrapped(failure))).toBe(false);
    expect(transport.diagnostics).toHaveLength(1);
  });

  it("never retries defects, unknown exceptions, encoding failures or malformed success bodies", () => {
    const response = HttpClientResponse.fromWeb(request, Response.json({}));

    for (const error of [
      new EffectQueryDefect("secret", new Error("secret")),
      new Error("secret"),
      wrapped(new HttpClientError({ reason: new EncodeError({ request }) })),
      wrapped(
        new HttpClientError({ reason: new DecodeError({ request, response }) })
      ),
    ]) {
      expect(shouldRetryQuery(0, error)).toBe(false);
    }
  });

  it("bounds transport retries and rejects permanent HTTP status failures", () => {
    const error = wrapped(
      new HttpClientError({ reason: new TransportError({ request }) })
    );

    expect(shouldRetryQuery(0, error)).toBe(true);
    expect(shouldRetryQuery(1, error)).toBe(false);

    for (const status of [400, 401, 403, 404, 409, 422, 500]) {
      const response = HttpClientResponse.fromWeb(
        request,
        new Response(null, { status })
      );

      expect(
        shouldRetryQuery(
          0,
          wrapped(
            new HttpClientError({
              reason: new StatusCodeError({ request, response }),
            })
          )
        )
      ).toBe(false);
    }
  });

  it.each([
    [
      new SquadBuilderPersistenceUnavailable({
        operation: "private operation",
      }),
      503,
    ],
    [
      new SquadBuilderUpstreamUnavailable({
        message: "private service details",
      }),
      502,
    ],
  ] as const)(
    "lets TanStack retry transient protocol failures exactly once",
    async (failure, status) => {
      const transport = makeTransport(() => Response.json(failure, { status }));
      await expect(
        transport.client.query(
          transport.eq.queryOptions({
            queryFn: () => getSquadGroupDetail({ groupId: 7 }),
            queryKey: ["transient"],
            retryDelay: 0,
          })
        )
      ).rejects.toBeInstanceOf(EffectQueryFailure);
      expect(transport.attempts()).toBe(2);
      expect(transport.diagnostics).toHaveLength(1);
    }
  );

  it("respects server Retry-After and correlates decoded rate-limit failures", async () => {
    vi.useFakeTimers();
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const correlationId = "12345678-1234-4234-8234-123456789abc";

    const transport = makeTransport(() =>
      Response.json(new SquadBuilderRateLimited({ message: "secret" }), {
        headers: { "Retry-After": "2", "x-request-id": correlationId },
        status: 429,
      })
    );

    const result = transport.client.query(
      transport.eq.queryOptions({
        meta: { operation: "squad-group-detail" },
        queryFn: () => getSquadGroupDetail({ groupId: 7 }),
        queryKey: ["rate-limited"],
      })
    );

    const rejection = expect(result).rejects.toBeInstanceOf(EffectQueryFailure);
    await vi.advanceTimersByTimeAsync(0);
    expect(transport.attempts()).toBe(1);
    await vi.advanceTimersByTimeAsync(1999);
    expect(transport.attempts()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(transport.attempts()).toBe(2);
    expect(transport.diagnostics).toEqual([
      {
        correlationId,
        errorTag: "RateLimited",
        operation: "squad-group-detail",
      },
    ]);
  });

  it.each(["Wed, 01 Jan 2031 00:00:05 GMT", "invalid", "-2"])(
    "handles HTTP-date or invalid Retry-After: %s",
    async (retryAfter) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
      onTestFinished(() => {
        vi.useRealTimers();
      });

      const transport = makeTransport(() =>
        Response.json(new SquadBuilderRateLimited({ message: "secret" }), {
          headers: { "Retry-After": retryAfter },
          status: 429,
        })
      );

      await expect(
        transport.client.query(
          transport.eq.queryOptions({
            queryFn: () => getSquadGroupDetail({ groupId: 7 }),
            queryKey: ["guidance"],
            retry: false,
          })
        )
      ).rejects.toBeInstanceOf(EffectQueryFailure);
      expect(
        queryRetryDelay(0, transport.client.getQueryState(["guidance"])?.error)
      ).toBe(retryAfter.startsWith("Wed") ? 5000 : 1000);
    }
  );

  it("pairs declared failure request IDs under concurrent reads and rejects unsafe IDs", async () => {
    let responses = 0;

    const ids = [
      "12345678-1234-4234-8234-123456789abc",
      "87654321-4321-4321-8321-cba987654321",
      "secret@example.com",
    ];

    const transport = makeTransport(() => {
      const requestId = ids[responses] ?? "";
      responses += 1;

      return Response.json(
        new SquadBuilderUnauthorized({ message: "secret cause" }),
        {
          headers: { "x-request-id": requestId },
          status: 401,
        }
      );
    });

    await Promise.allSettled(
      ids.map(
        async (_, index) =>
          await transport.client.query(
            transport.eq.queryOptions({
              meta: { operation: "squad-group-detail" },
              queryFn: () => getSquadGroupDetail({ groupId: index + 1 }),
              queryKey: ["private", index],
            })
          )
      )
    );
    expect(transport.attempts()).toBe(3);
    expect(
      new Set(transport.diagnostics.map((record) => record.correlationId))
    ).toEqual(new Set([ids[0], ids[1], undefined]));
    expect(JSON.stringify(transport.diagnostics)).not.toMatch(
      /secret|private/u
    );
  });

  it("keeps mutations non-retrying and reports no variables, messages, keys or raw causes", async () => {
    const transport = makeTransport(() => Response.json(null));
    let attempts = 0;
    const failure = new SquadBuilderConflict({ message: "secret payload" });

    const mutation = transport.client.getMutationCache().build(
      transport.client,
      transport.eq.mutationOptions({
        meta: { operation: "private operation" },
        mutationFn: (_payload: { readonly token: string }) =>
          Effect.suspend(() => {
            attempts += 1;

            return Effect.fail(failure);
          }),
        mutationKey: ["private key"],
      })
    );

    await expect(
      mutation.execute({ token: "secret variable" })
    ).rejects.toBeInstanceOf(EffectQueryFailure);
    expect(attempts).toBe(1);
    expect(transport.diagnostics).toEqual([
      { correlationId: undefined, errorTag: "Conflict", operation: "mutation" },
    ]);
    expect(JSON.stringify(transport.diagnostics)).not.toMatch(
      /secret|private/u
    );
  });
});

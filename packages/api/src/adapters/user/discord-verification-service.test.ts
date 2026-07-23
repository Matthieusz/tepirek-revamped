import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { TestClock } from "effect/testing";
import { afterEach, vi } from "vitest";

import { makeDiscordVerificationConfigLayer } from "./discord-verification-config.ts";
import {
  DiscordGuildVerifier,
  DiscordGuildVerifierLiveLayer,
} from "./discord-verification-service.ts";

const verifierLayer = DiscordGuildVerifierLiveLayer.pipe(
  Layer.provide(makeDiscordVerificationConfigLayer({ guildId: "guild-1" }))
);

const verify = (accessToken = Redacted.make("token")) =>
  DiscordGuildVerifier.use((verifier) =>
    verifier.verifyMembership(accessToken)
  ).pipe(Effect.provide(verifierLayer));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DiscordGuildVerifier", () => {
  it.effect("recognizes membership from a decoded guild payload", () =>
    Effect.gen(function* recognizeMembership() {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(Response.json([{ id: "guild-1" }])))
      );

      expect(yield* verify()).toBe(true);
    })
  );

  it.effect("returns false for non-membership and unauthorized tokens", () =>
    Effect.gen(function* rejectNonMembership() {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(Response.json([{ id: "guild-2" }]))
          .mockResolvedValueOnce(new Response(null, { status: 401 }))
      );

      expect(yield* verify()).toBe(false);
      expect(yield* verify()).toBe(false);
    })
  );

  it.effect.each([
    ["malformed payload", Response.json({ id: "guild-1" })],
    ["rate limiting", new Response(null, { status: 429 })],
    ["server failure", new Response(null, { status: 503 })],
  ])("maps %s to UserAdapterError", (_name, response) =>
    Effect.gen(function* mapFailure() {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.resolve(response))
      );

      const fiber = yield* verify().pipe(Effect.forkChild);
      yield* TestClock.adjust(1000);
      const exit = yield* Fiber.await(fiber);
      expect(Exit.isFailure(exit)).toBe(true);
    })
  );

  it.effect("retries transient responses with a bounded policy", () =>
    Effect.gen(function* retryTransientResponses() {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 503 }))
        .mockResolvedValueOnce(Response.json([{ id: "guild-1" }]));
      vi.stubGlobal("fetch", fetchMock);

      const fiber = yield* verify().pipe(Effect.forkChild);
      yield* TestClock.adjust(200);

      expect(yield* Fiber.join(fiber)).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    })
  );

  it.effect("honors Discord Retry-After guidance for rate limits", () =>
    Effect.gen(function* honorRetryAfter() {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(null, {
            headers: { "Retry-After": "2" },
            status: 429,
          })
        )
        .mockResolvedValueOnce(Response.json([{ id: "guild-1" }]));
      vi.stubGlobal("fetch", fetchMock);

      const fiber = yield* verify().pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust(1999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      yield* TestClock.adjust(1);

      expect(yield* Fiber.join(fiber)).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    })
  );

  it.effect("ignores non-finite Retry-After values", () =>
    Effect.gen(function* ignoreNonFiniteRetryAfter() {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(null, {
            headers: { "Retry-After": "Infinity" },
            status: 429,
          })
        )
        .mockResolvedValueOnce(Response.json([{ id: "guild-1" }]));
      vi.stubGlobal("fetch", fetchMock);

      const fiber = yield* verify().pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust(1000);

      expect(yield* Fiber.join(fiber)).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    })
  );

  it.effect("uses the Effect clock for HTTP-date Retry-After values", () =>
    Effect.gen(function* honorHttpDateRetryAfter() {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(null, {
            headers: { "Retry-After": "Thu, 01 Jan 1970 00:00:02 GMT" },
            status: 429,
          })
        )
        .mockResolvedValueOnce(Response.json([{ id: "guild-1" }]));
      vi.stubGlobal("fetch", fetchMock);

      const fiber = yield* verify().pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust(1999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      yield* TestClock.adjust(1);

      expect(yield* Fiber.join(fiber)).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    })
  );

  it.effect("aborts a request that exceeds the timeout", () =>
    Effect.gen(function* abortTimedOutRequest() {
      let observedSignal: AbortSignal | undefined;
      vi.stubGlobal(
        "fetch",
        vi.fn((_input: string | URL | Request, init?: RequestInit) => {
          observedSignal = init?.signal ?? undefined;
          return Promise.withResolvers<Response>().promise;
        })
      );

      const fiber = yield* verify().pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust(10_000);
      const exit = yield* Fiber.await(fiber);

      expect(Exit.isFailure(exit)).toBe(true);
      expect(observedSignal?.aborted).toBe(true);
    })
  );

  it.effect("forwards interruption to the request AbortSignal", () =>
    Effect.gen(function* interruptRequest() {
      let observedSignal: AbortSignal | undefined;
      vi.stubGlobal(
        "fetch",
        vi.fn((_input: string | URL | Request, init?: RequestInit) => {
          observedSignal = init?.signal ?? undefined;
          return Promise.withResolvers<Response>().promise;
        })
      );

      const fiber = yield* verify().pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* Fiber.interrupt(fiber);

      expect(observedSignal?.aborted).toBe(true);
    })
  );
});

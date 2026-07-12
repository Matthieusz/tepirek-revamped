import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import { describe, expect, it, vi } from "vitest";

import { makeDiscordVerificationConfigLayer } from "./discord-verification-config.ts";
import {
  DiscordGuildVerifier,
  DiscordGuildVerifierLiveLayer,
} from "./discord-verification-service.ts";

const verifierLayer = DiscordGuildVerifierLiveLayer.pipe(
  Layer.provide(makeDiscordVerificationConfigLayer({ guildId: "guild-1" }))
);

const verify = (accessToken = "token") =>
  DiscordGuildVerifier.use((verifier) =>
    verifier.verifyMembership(accessToken)
  ).pipe(Effect.provide(verifierLayer));

describe("DiscordGuildVerifier", () => {
  it("recognizes membership from a decoded guild payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json([{ id: "guild-1" }])))
    );

    await expect(Effect.runPromise(verify())).resolves.toBe(true);
    vi.unstubAllGlobals();
  });

  it("returns false for non-membership and unauthorized tokens", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json([{ id: "guild-2" }]))
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
    );

    await expect(Effect.runPromise(verify())).resolves.toBe(false);
    await expect(Effect.runPromise(verify())).resolves.toBe(false);
    vi.unstubAllGlobals();
  });

  it.each([
    ["malformed payload", Response.json({ id: "guild-1" })],
    ["rate limiting", new Response(null, { status: 429 })],
    ["server failure", new Response(null, { status: 503 })],
  ])("maps %s to UserAdapterError", async (_name, response) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(response))
    );

    await expect(Effect.runPromise(verify())).rejects.toThrow();
    vi.unstubAllGlobals();
  });

  it("retries transient responses with a bounded policy", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json([{ id: "guild-1" }]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(Effect.runPromise(verify())).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("honors Discord Retry-After guidance for rate limits", async () => {
    vi.useFakeTimers();
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

    const result = Effect.runPromise(verify());
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("aborts a request that exceeds the timeout", async () => {
    vi.useFakeTimers();
    let observedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: string | URL | Request, init?: RequestInit) => {
        observedSignal = init?.signal ?? undefined;
        return Promise.withResolvers<Response>().promise;
      })
    );

    const result = Effect.runPromiseExit(verify());
    await vi.advanceTimersByTimeAsync(10_000);
    const exit = await result;

    expect(exit._tag).toBe("Failure");
    expect(observedSignal?.aborted).toBe(true);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("forwards interruption to the request AbortSignal", async () => {
    let observedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: string | URL | Request, init?: RequestInit) => {
        observedSignal = init?.signal ?? undefined;
        return Promise.withResolvers<Response>().promise;
      })
    );

    const fiber = Effect.runFork(verify());
    await vi.waitFor(() => expect(observedSignal).toBeDefined());
    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(observedSignal?.aborted).toBe(true);
    vi.unstubAllGlobals();
  });
});

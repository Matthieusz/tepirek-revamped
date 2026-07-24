import { describe, expect, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { TestClock } from "effect/testing";
import * as HttpClient from "effect/unstable/http/HttpClient";
import * as HttpClientError from "effect/unstable/http/HttpClientError";
import type * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";

import { makeDiscordVerificationConfigLayer } from "./discord-verification-config.ts";
import {
  DiscordGuildVerifier,
  DiscordGuildVerifierLiveLayer,
} from "./discord-verification-service.ts";

const TEST_ACCESS_TOKEN = Redacted.make("test-token");

type ClientStep = (
  request: HttpClientRequest.HttpClientRequest
) => Effect.Effect<
  HttpClientResponse.HttpClientResponse,
  HttpClientError.HttpClientError
>;

const jsonResponse =
  (body: unknown, status = 200): ClientStep =>
  (request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(request, Response.json(body, { status }))
    );

const textResponse =
  (body: string): ClientStep =>
  (request) =>
    Effect.succeed(HttpClientResponse.fromWeb(request, new Response(body)));

const emptyResponse =
  (status: number, headers?: Readonly<Record<string, string>>): ClientStep =>
  (request) =>
    Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        new Response(null, {
          status,
          ...(headers === undefined ? {} : { headers }),
        })
      )
    );

const makeSequenceClient = (
  steps: readonly ClientStep[],
  requests: HttpClientRequest.HttpClientRequest[] = []
): HttpClient.HttpClient => {
  let attempt = 0;
  return HttpClient.make((request) =>
    Effect.suspend(() => {
      requests.push(request);
      const step = steps[attempt];
      attempt += 1;
      return step === undefined
        ? Effect.die(new Error("Unexpected Discord HTTP attempt"))
        : step(request);
    })
  );
};

const verifierLayer = (client: HttpClient.HttpClient) =>
  DiscordGuildVerifierLiveLayer.pipe(
    Layer.provide(
      Layer.merge(
        makeDiscordVerificationConfigLayer({ guildId: "guild-1" }),
        Layer.succeed(HttpClient.HttpClient, client)
      )
    )
  );

const verify = (
  client: HttpClient.HttpClient,
  accessToken = TEST_ACCESS_TOKEN
) =>
  DiscordGuildVerifier.use((verifier) =>
    verifier.verifyMembership(accessToken)
  ).pipe(Effect.provide(verifierLayer(client)));

const awaitAfter = <A, E>(
  fiber: Fiber.Fiber<A, E>,
  duration: Parameters<typeof TestClock.adjust>[0]
) =>
  Effect.gen(function* awaitAdjustedFiber() {
    yield* TestClock.adjust(duration);
    return yield* Fiber.await(fiber);
  });

describe("DiscordGuildVerifier", () => {
  it.effect("constructs the authenticated Discord guild-list request", () =>
    Effect.gen(function* requestDiscordGuilds() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeSequenceClient(
        [jsonResponse([{ id: "guild-1" }])],
        requests
      );

      expect(yield* verify(client)).toBe(true);
      expect(requests).toHaveLength(1);
      expect(requests[0]).toMatchObject({
        headers: {
          accept: "application/json",
          authorization: "Bearer test-token",
        },
        method: "GET",
        url: "https://discord.com/api/users/@me/guilds",
      });
      expect(JSON.stringify(requests[0])).not.toContain("test-token");
    })
  );

  it.effect("returns false when the decoded guild list has no match", () =>
    Effect.gen(function* rejectNonMembership() {
      const client = makeSequenceClient([jsonResponse([{ id: "guild-2" }])]);
      expect(yield* verify(client)).toBe(false);
    })
  );

  it.effect.each([401, 403])(
    "returns false when Discord responds with %s",
    (status) =>
      Effect.gen(function* rejectAuthorization() {
        const client = makeSequenceClient([emptyResponse(status)]);
        expect(yield* verify(client)).toBe(false);
      })
  );

  it.effect("maps a malformed Discord schema payload with its cause", () =>
    Effect.gen(function* rejectMalformedPayload() {
      const client = makeSequenceClient([jsonResponse({ id: "guild-1" })]);
      const error = yield* Effect.flip(verify(client));

      expect(error).toMatchObject({
        _tag: "UserAdapterError",
        cause: { _tag: "SchemaError" },
        operation: "verifyDiscordGuildMembership",
      });
    })
  );

  it.effect("maps malformed Discord JSON with its native decode cause", () =>
    Effect.gen(function* rejectMalformedJson() {
      const client = makeSequenceClient([textResponse("{")]);
      const error = yield* Effect.flip(verify(client));

      expect(error).toMatchObject({
        _tag: "UserAdapterError",
        cause: {
          _tag: "HttpClientError",
          reason: { _tag: "DecodeError" },
        },
        operation: "verifyDiscordGuildMembership",
      });
    })
  );

  it.effect("does not retry a non-transient Discord status", () =>
    Effect.gen(function* rejectPermanentFailure() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeSequenceClient([emptyResponse(501)], requests);
      const error = yield* Effect.flip(verify(client));

      expect(requests).toHaveLength(1);
      expect(error).toMatchObject({
        _tag: "UserAdapterError",
        cause: {
          _tag: "HttpClientError",
          reason: {
            _tag: "StatusCodeError",
            response: { status: 501 },
          },
        },
      });
    })
  );

  it.effect.each([408, 429, 500, 502, 503, 504])(
    "retries transient Discord status %s exactly twice",
    (status) =>
      Effect.gen(function* retryTransientStatus() {
        const requests: HttpClientRequest.HttpClientRequest[] = [];
        const client = makeSequenceClient(
          [emptyResponse(status), emptyResponse(status), emptyResponse(status)],
          requests
        );

        const fiber = yield* verify(client).pipe(Effect.forkChild);
        const exit = yield* awaitAfter(fiber, "2 seconds");

        expect(Exit.isFailure(exit)).toBe(true);
        expect(requests).toHaveLength(3);
      })
  );

  it.effect("recovers after a transient Discord response", () =>
    Effect.gen(function* recoverFromTransientStatus() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeSequenceClient(
        [emptyResponse(503), jsonResponse([{ id: "guild-1" }])],
        requests
      );

      const fiber = yield* verify(client).pipe(Effect.forkChild);
      yield* TestClock.adjust("1 second");

      expect(yield* Fiber.join(fiber)).toBe(true);
      expect(requests).toHaveLength(2);
    })
  );

  it.effect("keeps one attempt bound across mixed transient failures", () =>
    Effect.gen(function* boundMixedFailures() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const transportErrors: HttpClientError.HttpClientError[] = [];
      const transportFailure: ClientStep = (request) => {
        const error = new HttpClientError.HttpClientError({
          reason: new HttpClientError.TransportError({
            cause: new Error("network unavailable"),
            request,
          }),
        });
        transportErrors.push(error);
        return Effect.fail(error);
      };
      const client = makeSequenceClient(
        [transportFailure, emptyResponse(503), transportFailure],
        requests
      );

      const fiber = yield* verify(client).pipe(Effect.forkChild);
      yield* TestClock.adjust("2 seconds");
      const error = yield* Effect.flip(Fiber.join(fiber));

      expect(requests).toHaveLength(3);
      expect(error.cause).toBe(transportErrors[1]);
    })
  );

  it.effect("waits for delta-seconds Retry-After guidance", () =>
    Effect.gen(function* honorDeltaSeconds() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeSequenceClient(
        [
          emptyResponse(429, { "Retry-After": "2" }),
          jsonResponse([{ id: "guild-1" }]),
        ],
        requests
      );

      const fiber = yield* verify(client).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust(1999);
      expect(requests).toHaveLength(1);
      yield* TestClock.adjust(1);

      expect(yield* Fiber.join(fiber)).toBe(true);
      expect(requests).toHaveLength(2);
    })
  );

  it.effect("uses the Effect clock for HTTP-date Retry-After guidance", () =>
    Effect.gen(function* honorHttpDate() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeSequenceClient(
        [
          emptyResponse(429, {
            "Retry-After": "Thu, 01 Jan 1970 00:00:02 GMT",
          }),
          jsonResponse([{ id: "guild-1" }]),
        ],
        requests
      );

      const fiber = yield* verify(client).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust(1999);
      expect(requests).toHaveLength(1);
      yield* TestClock.adjust(1);

      expect(yield* Fiber.join(fiber)).toBe(true);
      expect(requests).toHaveLength(2);
    })
  );

  it.effect.each(["Infinity", "-1", "not-a-date"])(
    "ignores invalid Retry-After value %s",
    (retryAfter) =>
      Effect.gen(function* ignoreInvalidRetryAfter() {
        const requests: HttpClientRequest.HttpClientRequest[] = [];
        const client = makeSequenceClient(
          [
            emptyResponse(429, { "Retry-After": retryAfter }),
            jsonResponse([{ id: "guild-1" }]),
          ],
          requests
        );

        const fiber = yield* verify(client).pipe(Effect.forkChild);
        yield* TestClock.adjust("1 second");

        expect(yield* Fiber.join(fiber)).toBe(true);
        expect(requests).toHaveLength(2);
      })
  );

  it.effect("cuts off Retry-After guidance at the overall deadline", () =>
    Effect.gen(function* timeOutProviderDelay() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const client = makeSequenceClient(
        [emptyResponse(429, { "Retry-After": "20" })],
        requests
      );

      const fiber = yield* verify(client).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust(9999);
      expect(requests).toHaveLength(1);
      yield* TestClock.adjust(1);
      const error = yield* Effect.flip(Fiber.join(fiber));

      expect(requests).toHaveLength(1);
      expect(error).toMatchObject({
        _tag: "UserAdapterError",
        cause: { _tag: "TimeoutError" },
      });
    })
  );

  it.effect("applies ten seconds to the complete multi-attempt operation", () =>
    Effect.gen(function* enforceOverallDeadline() {
      const requests: HttpClientRequest.HttpClientRequest[] = [];
      const slowFailure: ClientStep = (request) =>
        emptyResponse(503)(request).pipe(Effect.delay("6 seconds"));
      const client = makeSequenceClient(
        [slowFailure, slowFailure, slowFailure],
        requests
      );

      const fiber = yield* verify(client).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("7 seconds");
      expect(requests).toHaveLength(2);
      yield* TestClock.adjust("3 seconds");
      const error = yield* Effect.flip(Fiber.join(fiber));

      expect(requests).toHaveLength(2);
      expect(error.cause).toMatchObject({ _tag: "TimeoutError" });
    })
  );

  it.effect("forwards interruption to the injected HTTP client effect", () =>
    Effect.gen(function* interruptHttpClient() {
      const started = yield* Deferred.make<true>();
      const interrupted = yield* Deferred.make<true>();
      const client = HttpClient.make((_request) =>
        Deferred.succeed(started, true).pipe(
          Effect.andThen(
            Effect.never.pipe(
              Effect.ensuring(Deferred.succeed(interrupted, true))
            )
          )
        )
      );

      const fiber = yield* verify(client).pipe(Effect.forkChild);
      yield* Deferred.await(started);
      yield* Fiber.interrupt(fiber);
      yield* Deferred.await(interrupted);
    })
  );
});

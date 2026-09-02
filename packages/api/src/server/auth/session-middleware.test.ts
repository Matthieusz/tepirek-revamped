import { expect, it } from "@effect/vitest";
import {
  BetterAuthService,
  BetterAuthUnavailable,
  createAuth,
} from "@tepirek-revamped/auth";
import { makeBetterAuthDatabase } from "@tepirek-revamped/db/effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { Pool } from "pg";
import { afterAll } from "vitest";

import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import {
  InvalidSession,
  SessionUnavailable,
} from "../../protocol/auth/http-api-middleware.ts";
import { loadCurrentSession } from "./session-middleware.ts";

const testPool = new Pool({
  connectionString: "postgresql://postgres:password@localhost:5433/test",
});
const testBetterAuthInstance = createAuth(
  {
    betterAuthSecret: Redacted.make("test-secret-at-least-32-characters"),
    betterAuthUrl: new URL("http://localhost:3000"),
    corsOrigin: new URL("http://localhost:3001"),
    discordClientId: "test-discord-client-id",
    discordClientSecret: Redacted.make("test-discord-client-secret"),
    isProduction: false,
  },
  makeBetterAuthDatabase(testPool)
);

afterAll(async () => {
  await testPool.end();
});

const authenticatedSession = (userId: string) => ({
  session: {
    createdAt: new Date(0),
    expiresAt: new Date(1),
    id: "session-id",
    token: "session-token",
    updatedAt: new Date(0),
    userId,
  },
  user: {
    createdAt: new Date(0),
    email: "user@example.com",
    emailVerified: true,
    id: userId,
    image: null,
    name: "User",
    role: "user",
    updatedAt: new Date(0),
    verified: true,
  },
});

it.effect(
  "projects a rejected Better Auth call into a safe middleware failure",
  () => {
    const internalCause = new Error("database connection and token details");
    const authLayer = Layer.succeed(BetterAuthService, {
      getSession: () =>
        Effect.fail(new BetterAuthUnavailable({ cause: internalCause })),
      instance: testBetterAuthInstance,
    });

    return Effect.gen(function* rejectedSessionTest() {
      const failure = yield* loadCurrentSession(new Headers()).pipe(
        Effect.flip
      );

      expect(failure).toEqual(
        new SessionUnavailable({ message: "SESSION_UNAVAILABLE" })
      );
      // Trusted test value; sync encoding keeps the assertion focused.
      // @effect-diagnostics-next-line schemaSyncInEffect:off
      const encoded = Schema.encodeUnknownSync(SessionUnavailable)(failure);
      expect(encoded).toEqual({
        _tag: "SessionUnavailable",
        message: "SESSION_UNAVAILABLE",
      });
      expect(JSON.stringify(encoded)).not.toContain(internalCause.message);
    }).pipe(Effect.provide(authLayer));
  }
);

it.effect("provides an empty current session for an expired session", () => {
  const authLayer = Layer.succeed(BetterAuthService, {
    getSession: () => Effect.succeed(null),
    instance: testBetterAuthInstance,
  });

  return Effect.gen(function* expiredSessionTest() {
    const session = yield* loadCurrentSession(new Headers());
    expect(session).toBeNull();
  }).pipe(Effect.provide(authLayer));
});

it.effect("decodes the authenticated user id at the session boundary", () => {
  const authLayer = Layer.succeed(BetterAuthService, {
    getSession: () => Effect.succeed(authenticatedSession("user-id")),
    instance: testBetterAuthInstance,
  });

  return Effect.gen(function* validUserIdTest() {
    const session = yield* loadCurrentSession(new Headers());

    expect(session?.user.id).toBe(AppUserId.make("user-id"));
  }).pipe(Effect.provide(authLayer));
});

it.effect(
  "rejects an empty authenticated user id as an invalid session",
  () => {
    const authLayer = Layer.succeed(BetterAuthService, {
      getSession: () => Effect.succeed(authenticatedSession("")),
      instance: testBetterAuthInstance,
    });

    return Effect.gen(function* invalidUserIdTest() {
      const failure = yield* loadCurrentSession(new Headers()).pipe(
        Effect.flip
      );

      expect(failure).toEqual(
        new InvalidSession({ message: "INVALID_SESSION" })
      );
      // Trusted test value; sync encoding keeps the assertion focused.
      // @effect-diagnostics-next-line schemaSyncInEffect:off
      const encoded = Schema.encodeUnknownSync(InvalidSession)(failure);
      expect(JSON.stringify(encoded)).not.toContain("session-token");
    }).pipe(Effect.provide(authLayer));
  }
);

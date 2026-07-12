import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { AppUserId } from "../../domain/squad-builder/app-user-id.js";
import { InvalidSession } from "../../protocol/auth/invalid-session.js";
import { SessionUnavailable } from "../../protocol/auth/session-unavailable.js";
import { BetterAuthAdapter } from "./better-auth-adapter.js";
import { BetterAuthUnavailable } from "./better-auth-errors.js";
import { loadCurrentSession } from "./session-middleware.js";

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
    const adapterLayer = Layer.succeed(BetterAuthAdapter, {
      getSession: () =>
        Effect.fail(new BetterAuthUnavailable({ cause: internalCause })),
    });

    return Effect.gen(function* rejectedSessionTest() {
      const failure = yield* loadCurrentSession(new Headers()).pipe(
        Effect.flip
      );

      expect(failure).toEqual(
        new SessionUnavailable({ message: "SESSION_UNAVAILABLE" })
      );
      const encoded = Schema.encodeUnknownSync(SessionUnavailable)(failure);
      expect(encoded).toEqual({
        _tag: "SessionUnavailable",
        message: "SESSION_UNAVAILABLE",
      });
      expect(JSON.stringify(encoded)).not.toContain(internalCause.message);
    }).pipe(Effect.provide(adapterLayer));
  }
);

it.effect("provides an empty current session for an expired session", () => {
  const adapterLayer = Layer.succeed(BetterAuthAdapter, {
    getSession: () => Effect.succeed(null),
  });

  return Effect.gen(function* expiredSessionTest() {
    const session = yield* loadCurrentSession(new Headers());
    expect(session).toBeNull();
  }).pipe(Effect.provide(adapterLayer));
});

it.effect("decodes the authenticated user id at the session boundary", () => {
  const adapterLayer = Layer.succeed(BetterAuthAdapter, {
    getSession: () => Effect.succeed(authenticatedSession("user-id")),
  });

  return Effect.gen(function* validUserIdTest() {
    const session = yield* loadCurrentSession(new Headers());

    expect(session?.user.id).toBe(AppUserId.make("user-id"));
  }).pipe(Effect.provide(adapterLayer));
});

it.effect(
  "rejects an empty authenticated user id as an invalid session",
  () => {
    const adapterLayer = Layer.succeed(BetterAuthAdapter, {
      getSession: () => Effect.succeed(authenticatedSession("")),
    });

    return Effect.gen(function* invalidUserIdTest() {
      const failure = yield* loadCurrentSession(new Headers()).pipe(
        Effect.flip
      );

      expect(failure).toEqual(
        new InvalidSession({ message: "INVALID_SESSION" })
      );
      expect(
        JSON.stringify(Schema.encodeUnknownSync(InvalidSession)(failure))
      ).not.toContain("session-token");
    }).pipe(Effect.provide(adapterLayer));
  }
);

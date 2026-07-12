import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import { CurrentSession } from "../../protocol/auth/current-session.ts";
import { makeAuthorizationPolicy } from "./authorization-policy.ts";

const policy = makeAuthorizationPolicy({
  forbidden: () => "forbidden" as const,
  unauthorized: () => "unauthorized" as const,
  unverified: () => "unverified" as const,
});

const sessionLayer = (verified: boolean, role: string) =>
  Layer.succeed(CurrentSession, {
    session: {
      createdAt: new Date(),
      expiresAt: new Date(),
      id: "session-id",
      token: "token",
      updatedAt: new Date(),
      userId: "user-id",
    },
    user: {
      createdAt: new Date(),
      email: "user@example.com",
      emailVerified: true,
      id: AppUserId.make("user-id"),
      image: null,
      name: "User",
      role,
      updatedAt: new Date(),
      verified,
    },
  });

it.effect("rejects an anonymous request", () =>
  Effect.gen(function* anonymousPolicyTest() {
    const failure = yield* policy.requireSession().pipe(Effect.flip);
    expect(failure).toBe("unauthorized");
  }).pipe(Effect.provide(Layer.succeed(CurrentSession, null)))
);

it.effect("rejects an unverified user", () =>
  Effect.gen(function* unverifiedPolicyTest() {
    const failure = yield* policy.requireVerifiedSession().pipe(Effect.flip);
    expect(failure).toBe("unverified");
  }).pipe(Effect.provide(sessionLayer(false, "user")))
);

it.effect("rejects a verified non-admin user from an admin policy", () =>
  Effect.gen(function* nonAdminPolicyTest() {
    const failure = yield* policy.requireAdminSession().pipe(Effect.flip);
    expect(failure).toBe("forbidden");
  }).pipe(Effect.provide(sessionLayer(true, "user")))
);

it.effect("allows an admin user", () =>
  Effect.gen(function* adminPolicyTest() {
    const session = yield* policy.requireAdminSession();
    expect(session.user.role).toBe("admin");
  }).pipe(Effect.provide(sessionLayer(true, "admin")))
);

import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { SessionUnavailable } from "../../protocol/auth/session-unavailable.js";
import { BetterAuthAdapter } from "./better-auth-adapter.js";
import { BetterAuthUnavailable } from "./better-auth-errors.js";
import { loadCurrentSession } from "./session-middleware.js";

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

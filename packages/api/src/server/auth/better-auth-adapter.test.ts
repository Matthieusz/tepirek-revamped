import { expect, it } from "@effect/vitest";
import type { Auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";

import {
  BetterAuthAdapter,
  makeBetterAuthAdapterLayer,
} from "./better-auth-adapter.js";

it.effect("projects rejected Better Auth calls into a typed failure", () => {
  const cause = new Error("session store unavailable");
  // SAFETY: The adapter only reads api.getSession; this fixture implements that
  // complete runtime surface with the production method's async behavior.
  const auth = {
    api: {
      getSession: () => Promise.reject(cause),
    },
  } as unknown as Auth;

  return Effect.gen(function* betterAuthAdapterTest() {
    const adapter = yield* BetterAuthAdapter;
    const failure = yield* adapter.getSession(new Headers()).pipe(Effect.flip);

    expect(failure._tag).toBe("BetterAuthUnavailable");
    expect(failure.cause).toBe(cause);
  }).pipe(Effect.provide(makeBetterAuthAdapterLayer(auth)));
});

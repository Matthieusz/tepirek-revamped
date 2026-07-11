import * as Effect from "effect/Effect";

import { CurrentSession } from "../../protocol/auth/current-session.js";

export interface AuthorizationFailures<Unauthorized, Forbidden> {
  readonly forbidden: () => Forbidden;
  readonly unauthorized: () => Unauthorized;
  readonly unverified: () => Forbidden;
}

/** Build consistent authenticated, verified-user, and admin policies. */
export const makeAuthorizationPolicy = <Unauthorized, Forbidden>(
  failures: AuthorizationFailures<Unauthorized, Forbidden>
) => {
  const requireSession = Effect.fn("AuthorizationPolicy.requireSession")(
    function* requireSession() {
      const session = yield* CurrentSession;
      if (session === null) {
        return yield* Effect.fail(failures.unauthorized());
      }
      return session;
    }
  );

  const requireVerifiedSession = Effect.fn(
    "AuthorizationPolicy.requireVerifiedSession"
  )(function* requireVerifiedSession() {
    const session = yield* requireSession();
    if (session.user.verified !== true) {
      return yield* Effect.fail(failures.unverified());
    }
    return session;
  });

  const requireAdminSession = Effect.fn(
    "AuthorizationPolicy.requireAdminSession"
  )(function* requireAdminSession() {
    const session = yield* requireVerifiedSession();
    if (session.user.role !== "admin") {
      return yield* Effect.fail(failures.forbidden());
    }
    return session;
  });

  return { requireAdminSession, requireSession, requireVerifiedSession };
};

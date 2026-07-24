import * as Context from "effect/Context";
import * as Effect from "effect/Effect";

import { BetterAuthUnavailable } from "./better-auth-unavailable.ts";
import type { BetterAuthInstance, BetterAuthSession } from "./index.ts";

/** Operations and vendor instance exposed by the Better Auth boundary. */
export interface BetterAuthServiceInterface {
  readonly instance: BetterAuthInstance;
  readonly getSession: (
    headers: Headers
  ) => Effect.Effect<BetterAuthSession, BetterAuthUnavailable>;
}

/** Effect-owned Better Auth integration boundary. */
export class BetterAuthService extends Context.Service<
  BetterAuthService,
  BetterAuthServiceInterface
>()("@tepirek-revamped/auth/BetterAuthService") {}

/** Construct a Better Auth service value around a vendor instance. */
export const makeBetterAuthService = (
  instance: BetterAuthInstance
): BetterAuthServiceInterface =>
  BetterAuthService.of({
    getSession: Effect.fn("BetterAuthService.getSession")((headers: Headers) =>
      Effect.tryPromise({
        catch: (cause) => new BetterAuthUnavailable({ cause }),
        try: () => instance.api.getSession({ headers }),
      })
    ),
    instance,
  });

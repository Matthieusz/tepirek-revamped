/* eslint-disable max-classes-per-file -- Collocated service error schema. */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { BetterAuthInstance, BetterAuthSession } from "./index.ts";

/** Expected failure when Better Auth cannot load a session. */
export class BetterAuthUnavailable extends Schema.TaggedErrorClass<BetterAuthUnavailable>()(
  "BetterAuthUnavailable",
  { cause: Schema.Defect() }
) {}

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
        try: async () => await instance.api.getSession({ headers }),
      })
    ),
    instance,
  });

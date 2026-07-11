import type { Auth } from "@tepirek-revamped/auth";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { BetterAuthUnavailable } from "./better-auth-errors.js";

export { BetterAuthUnavailable } from "./better-auth-errors.js";

export type AuthSession = Awaited<ReturnType<Auth["api"]["getSession"]>>;

/** Adapter capability for loading Better Auth sessions without rejected promises. */
export class BetterAuthAdapter extends Context.Service<
  BetterAuthAdapter,
  {
    readonly getSession: (
      headers: Headers
    ) => Effect.Effect<AuthSession, BetterAuthUnavailable>;
  }
>()("@tepirek-revamped/api/BetterAuthAdapter") {}

/** Construct a Better Auth adapter layer from a composition-root instance. */
export const makeBetterAuthAdapterLayer = (
  auth: Auth
): Layer.Layer<BetterAuthAdapter> =>
  Layer.succeed(BetterAuthAdapter, {
    getSession: Effect.fn("BetterAuthAdapter.getSession")((headers: Headers) =>
      Effect.tryPromise({
        catch: (cause) => new BetterAuthUnavailable({ cause }),
        try: () => auth.api.getSession({ headers }),
      })
    ),
  });

import { BetterAuthService } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import { HttpEffect, HttpRouter } from "effect/http";
import * as Layer from "effect/Layer";

/**
 * Mount Better Auth through Effect's Web Standard handler adapter.
 * Better Auth owns endpoint validation, cookies, redirects, and auth errors.
 */
export const BetterAuthHttpRoutes = Layer.unwrap(
  Effect.gen(function* makeBetterAuthHttpRoutes() {
    const auth = yield* BetterAuthService;

    return HttpRouter.add(
      "*",
      "/api/auth/*",
      HttpEffect.fromWebHandler(auth.instance.handler)
    );
  })
);

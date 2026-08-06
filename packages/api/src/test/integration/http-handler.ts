import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import { HttpRouter } from "effect/unstable/http";

export interface IntegrationHandler {
  readonly handler: (request: Request) => Promise<Response>;
  readonly dispose: () => Promise<void>;
}

/** Acquire an integration HTTP handler and release its application scope. */
export const integrationHandler = <
  A,
  E,
  R extends
    | HttpRouter.HttpRouter
    | HttpRouter.Request<"Requires", unknown>
    | HttpRouter.Request<"GlobalRequires", unknown>
    | HttpRouter.Request<"Error", unknown>
    | HttpRouter.Request<"GlobalError", unknown>,
>(
  appLayer: Layer.Layer<A, E, R>
) =>
  Effect.acquireRelease(
    Effect.sync(() =>
      HttpRouter.toWebHandler(appLayer, {
        disableLogger: true,
      })
    ),
    (runtime) =>
      Effect.promise(async () => {
        await runtime.dispose();
      })
  );

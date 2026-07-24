import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import { Hono } from "hono";

import {
  makeServerHostLayer,
  ServerApplication,
  withHotReload,
} from "./index.js";

const scopedBuild = <A, E>(layer: Layer.Layer<A, E>) =>
  Effect.scoped(Layer.build(layer));

it.effect("releases the server, handlers, and pool in dependency order", () => {
  const calls: string[] = [];
  const applicationLayer = Layer.effect(
    ServerApplication,
    Effect.gen(function* acquireControlledApplication() {
      yield* Effect.acquireRelease(Effect.void, () =>
        Effect.sync(() => {
          calls.push("pool");
        })
      );
      yield* Effect.acquireRelease(Effect.void, () =>
        Effect.sync(() => {
          calls.push("handlers");
        })
      );
      return ServerApplication.of({ app: new Hono() });
    })
  );
  const serverLayer = makeServerHostLayer(applicationLayer, () =>
    Effect.succeed({
      stop: () => {
        calls.push("server");
        return Promise.resolve();
      },
    })
  );

  return Effect.gen(function* verifyFinalizerOrder() {
    yield* scopedBuild(serverLayer);
    expect(calls).toEqual(["server", "handlers", "pool"]);
  });
});

it.effect("does not serve when handler-layer acquisition fails", () => {
  const handlerFailure = new Error("handler layer failed");
  const handlerLayer = Layer.effectDiscard(Effect.fail(handlerFailure));
  const applicationLayer = Layer.effect(
    ServerApplication,
    Effect.gen(function* acquireApplicationHandlers() {
      yield* Layer.build(handlerLayer);
      return ServerApplication.of({ app: new Hono() });
    })
  );
  let serveCalled = false;
  const serverLayer = makeServerHostLayer(applicationLayer, () => {
    serveCalled = true;
    return Effect.succeed({ stop: () => Promise.resolve() });
  });

  return Effect.gen(function* verifyHandlerAcquisitionPrecedesServe() {
    const failure = yield* scopedBuild(serverLayer).pipe(Effect.flip);

    expect(failure).toBe(handlerFailure);
    expect(serveCalled).toBe(false);
  });
});

it.effect("releases acquired resources when server startup fails", () => {
  const calls: string[] = [];
  const applicationLayer = Layer.effect(
    ServerApplication,
    Effect.acquireRelease(
      Effect.sync(() => ServerApplication.of({ app: new Hono() })),
      () =>
        Effect.sync(() => {
          calls.push("application");
        })
    )
  );
  const startupFailure = new Error("server startup failed");
  const serverLayer = makeServerHostLayer(applicationLayer, () =>
    Effect.fail(startupFailure)
  );

  return Effect.gen(function* verifyPartialStartupCleanup() {
    const failure = yield* scopedBuild(serverLayer).pipe(Effect.flip);

    expect(failure).toBe(startupFailure);
    expect(calls).toEqual(["application"]);
  });
});

it.effect("hot reload interrupts the root and awaits finalization", () => {
  const calls: string[] = [];
  let dispose: (() => Promise<void>) | undefined;
  const hot = {
    dispose: (finalizer: () => Promise<void>) => {
      dispose = finalizer;
    },
  };
  const application = Effect.acquireRelease(Effect.void, () =>
    Effect.sync(() => {
      calls.push("finalized");
    })
  ).pipe(Effect.andThen(Effect.never));

  return Effect.gen(function* verifyHotReload() {
    const fiber = yield* withHotReload(Effect.scoped(application), hot).pipe(
      Effect.forkChild
    );
    yield* Effect.yieldNow;

    if (dispose === undefined) {
      return yield* Effect.die("Expected hot reload disposal to be registered");
    }
    yield* Effect.promise(dispose);
    yield* Fiber.join(fiber);

    expect(calls).toEqual(["finalized"]);
  });
});

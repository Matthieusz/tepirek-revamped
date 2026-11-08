import { createServer } from "node:http";

import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import { expect, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import { HttpMiddleware, HttpServer, HttpServerResponse } from "effect/http";
import * as Layer from "effect/Layer";
import * as NetAddress from "effect/net/NetAddress";
import * as Scope from "effect/Scope";

import { ServerApplication } from "./http-application.ts";
import { makeServerHostLayer } from "./index.js";

const application = ServerApplication.of({
  httpEffect: Effect.succeed(HttpServerResponse.text("OK")),
  middleware: HttpMiddleware.logger,
});

const scopedBuild = <A, E>(layer: Layer.Layer<A, E>) =>
  Effect.scoped(Layer.build(layer));

it.effect("releases the server, handlers, and pool in dependency order", () => {
  const calls: string[] = [];

  const recordRelease = (name: string) =>
    Effect.acquireRelease(Effect.void, () =>
      Effect.sync(() => {
        calls.push(name);
      })
    );

  const applicationLayer = Layer.effect(
    ServerApplication,
    Effect.gen(function* acquireControlledApplication() {
      yield* recordRelease("pool");
      yield* recordRelease("handlers");

      return application;
    })
  );

  const serverLayer = Layer.succeed(
    HttpServer.HttpServer,
    HttpServer.make({
      address: NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 3000),
      serve: () => recordRelease("server"),
    })
  );

  return Effect.gen(function* verifyFinalizerOrder() {
    yield* scopedBuild(makeServerHostLayer(applicationLayer, serverLayer));
    expect(calls).toEqual(["server", "handlers", "pool"]);
  });
});

it.effect("does not bind the host when handler-layer acquisition fails", () => {
  const handlerFailure = new Error("handler layer failed");

  const applicationLayer = Layer.effect(
    ServerApplication,
    Effect.fail(handlerFailure)
  );

  let hostAcquired = false;

  const serverLayer = Layer.sync(HttpServer.HttpServer, () => {
    hostAcquired = true;

    return HttpServer.make({
      address: NetAddress.inetAddressFromIpStringUnsafe("127.0.0.1", 3000),
      serve: () => Effect.void,
    });
  });

  return Effect.gen(function* verifyAcquisitionOrder() {
    const failure = yield* scopedBuild(
      makeServerHostLayer(applicationLayer, serverLayer)
    ).pipe(Effect.flip);

    expect(failure).toBe(handlerFailure);
    expect(hostAcquired).toBe(false);
  });
});

it.effect("releases application resources when host acquisition fails", () => {
  let released = false;

  const applicationLayer = Layer.effect(
    ServerApplication,
    Effect.acquireRelease(Effect.succeed(application), () =>
      Effect.sync(() => {
        released = true;
      })
    )
  );

  const startupFailure = new Error("server startup failed");

  const serverLayer = Layer.effect(
    HttpServer.HttpServer,
    Effect.fail(startupFailure)
  );

  return Effect.gen(function* verifyPartialStartupCleanup() {
    const failure = yield* scopedBuild(
      makeServerHostLayer(applicationLayer, serverLayer)
    ).pipe(Effect.flip);

    expect(failure).toBe(startupFailure);
    expect(released).toBe(true);
  });
});

it.live(
  "drains an in-flight request before releasing application dependencies",
  () =>
    Effect.gen(function* verifyNativeDrain() {
      const started = yield* Deferred.make<undefined>();
      const finish = yield* Deferred.make<undefined>();
      let applicationReleased = false;

      const request = Effect.gen(function* controlledRequest() {
        yield* Deferred.succeed(started, undefined);
        yield* Deferred.await(finish);
        expect(applicationReleased).toBe(false);

        return HttpServerResponse.text("finished");
      });

      const applicationLayer = Layer.effect(
        ServerApplication,
        Effect.acquireRelease(
          Effect.succeed(
            ServerApplication.of({
              httpEffect: request,
              middleware: HttpMiddleware.logger,
            })
          ),
          () =>
            Effect.sync(() => {
              applicationReleased = true;
            })
        )
      );

      const nodeServer = createServer();

      const hostLayer = makeServerHostLayer(
        applicationLayer,
        NodeHttpServer.layerServer(() => nodeServer, {
          host: "127.0.0.1",
          port: 0,
        })
      );

      const scope = yield* Scope.make();
      yield* Effect.addFinalizer(() =>
        Deferred.succeed(finish, undefined).pipe(
          Effect.andThen(Scope.close(scope, Exit.void))
        )
      );
      const context = yield* Layer.buildWithScope(hostLayer, scope);
      const server = Context.get(context, HttpServer.HttpServer);

      const responseFiber = yield* Effect.promise(async () => {
        const response = await fetch(HttpServer.formatAddress(server.address));

        return await response.text();
      }).pipe(Effect.forkChild);

      yield* Deferred.await(started);

      const closing = yield* Scope.close(scope, Exit.void).pipe(
        Effect.forkChild
      );

      yield* Effect.yieldNow;
      expect(nodeServer.listening).toBe(false);
      expect(applicationReleased).toBe(false);
      yield* Deferred.succeed(finish, undefined);
      expect(yield* Fiber.join(responseFiber)).toBe("finished");
      yield* Fiber.join(closing);
      expect(applicationReleased).toBe(true);
      expect(nodeServer.listening).toBe(false);
    })
);

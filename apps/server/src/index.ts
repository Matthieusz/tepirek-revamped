import { createServer } from "node:http";

import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as Observability from "@tepirek-revamped/api/observability";
import { AuthConfig, BetterAuthServiceLiveLayer } from "@tepirek-revamped/auth";
import { makeDatabaseLayer } from "@tepirek-revamped/db/effect";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { HttpServer } from "effect/http";
import * as Layer from "effect/Layer";
import { initLoggerLayer } from "evlog/effect";

import {
  buildHttpApplicationLayer,
  ServerApplication,
} from "./http-application.ts";
import {
  buildStartupConfigLayer,
  readStartupConfig,
} from "./startup-config.js";
import type { StartupConfig } from "./startup-config.js";

/** Build the scoped Effect HTTP application and its shared database/auth dependencies. */
export const makeServerApplicationLayer = (startupConfig: StartupConfig) => {
  const databaseLayer = makeDatabaseLayer(startupConfig.databaseUrl);

  const authLayer = BetterAuthServiceLiveLayer.pipe(
    Layer.provide(Layer.succeed(AuthConfig, startupConfig.auth)),
    Layer.provide(databaseLayer)
  );

  const dependencies = Layer.merge(databaseLayer, authLayer);

  return buildHttpApplicationLayer(startupConfig).pipe(
    Layer.provide(dependencies),
    Layer.provide(NodeCrypto.layer),
    Layer.provide(initLoggerLayer({ env: { service: "tepirek-server" } }))
  );
};

/**
 * Acquire the native host only after all application routes are ready.
 * Shutdown drains requests before releasing route dependencies and the database.
 */
export const makeServerHostLayer = <ApplicationError, HostError>(
  applicationLayer: Layer.Layer<ServerApplication, ApplicationError>,
  serverLayer: Layer.Layer<HttpServer.HttpServer, HostError>
) =>
  Layer.effect(
    HttpServer.HttpServer,
    Effect.gen(function* acquireServerHost() {
      const application = yield* ServerApplication;
      const context = yield* Layer.build(serverLayer);
      const server = Context.get(context, HttpServer.HttpServer);

      yield* server.serve(application.httpEffect, application.middleware);

      return server;
    })
  ).pipe(Layer.provide(applicationLayer));

/** Build the complete Effect application and native Node HTTP host on port 3000. */
export const makeServerLayer = (startupConfig: StartupConfig) =>
  makeServerHostLayer(
    makeServerApplicationLayer(startupConfig),
    NodeHttpServer.layerServer(createServer, { port: 3000 })
  );

const dotEnvProvider = ConfigProvider.fromDotEnv().pipe(
  Effect.catchReason("PlatformError", "NotFound", () =>
    Effect.succeed(ConfigProvider.fromUnknown({}))
  ),
  Effect.provide(NodeFileSystem.layer)
);

const startupConfigProvider = dotEnvProvider.pipe(
  Effect.map((provider) =>
    ConfigProvider.orElse(ConfigProvider.fromEnv(), provider)
  )
);

const startupConfigLayer = Layer.unwrap(
  startupConfigProvider.pipe(Effect.map(buildStartupConfigLayer))
);

const main = readStartupConfig.pipe(
  Effect.provide(startupConfigLayer),
  Effect.flatMap((startupConfig) =>
    Layer.launch(makeServerLayer(startupConfig)).pipe(
      Effect.provide(
        Observability.makeLayer(startupConfig.observability).pipe(
          Layer.provide(NodeCrypto.layer)
        )
      )
    )
  )
);

if (import.meta.main) {
  NodeRuntime.runMain(main);
}

/* eslint-disable max-classes-per-file -- Collocated server service and startup error. */
import * as BunCrypto from "@effect/platform-bun/BunCrypto";
import * as BunFileSystem from "@effect/platform-bun/BunFileSystem";
import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as Observability from "@tepirek-revamped/api/observability";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { makeApiLiveLayerFromDatabase } from "@tepirek-revamped/api/server/effect-app";
import { HealthHttpApiLayer } from "@tepirek-revamped/api/server/health/http-api-handlers";
import { AppHttpApiLayer } from "@tepirek-revamped/api/server/http-api-handlers";
import {
  AuthConfig,
  AuthConfigLiveLayer,
  BetterAuthService,
  BetterAuthServiceLiveLayer,
} from "@tepirek-revamped/auth";
import {
  EffectDatabase,
  makeSharedDatabaseLayer,
} from "@tepirek-revamped/db/effect";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import {
  HttpEffect,
  HttpMiddleware,
  HttpRouter,
  HttpServer,
} from "effect/unstable/http";
import { OpenApi } from "effect/unstable/httpapi";
import { initLogger, parseError } from "evlog";
import { createAuthMiddleware } from "evlog/better-auth";
import { evlog } from "evlog/hono";
import type { EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import type { Context as HonoContext, Input as HonoInput } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { readStartupConfig } from "./startup-config.js";
import type { StartupConfig } from "./startup-config.js";

/** Scoped Hono application value used by tests and the Bun host. */
export interface ServerApplicationService {
  readonly app: Hono<EvlogVariables>;
}

/** Scoped Hono application with its Effect HTTP handler runtimes alive. */
export class ServerApplication extends Context.Service<
  ServerApplication,
  ServerApplicationService
>()("@tepirek-revamped/server/ServerApplication") {}

/** Expected failure while binding the Bun HTTP server. */
export class ServerStartupError extends Schema.TaggedErrorClass<ServerStartupError>()(
  "ServerStartupError",
  { cause: Schema.Defect() }
) {}

const appHttpApiEvlogExcludePath = "/**";
const contentfulStatusCodes: ReadonlySet<number> = new Set([
  100, 102, 103, 200, 201, 202, 203, 206, 207, 208, 226, 300, 301, 302, 303,
  305, 306, 307, 308, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410,
  411, 412, 413, 414, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428,
  429, 431, 451, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
]);
const isContentfulStatusCode = (
  status: number
): status is ContentfulStatusCode => contentfulStatusCodes.has(status);

const makeHonoApplicationLayer = (startupConfig: StartupConfig) =>
  Layer.effect(
    ServerApplication,
    Effect.gen(function* makeHonoApplication() {
      initLogger({ env: { service: "tepirek-server" } });

      const database = yield* EffectDatabase;
      const auth = yield* BetterAuthService;
      const app = new Hono<EvlogVariables>();
      const apiLiveLayer = makeApiLiveLayerFromDatabase(
        Layer.succeed(EffectDatabase, database),
        {
          discordGuildId: startupConfig.discordGuildId,
          firecrawl: startupConfig.firecrawl,
        }
      );
      const appHttpApiServices = Layer.merge(
        apiLiveLayer,
        Layer.succeed(BetterAuthService, auth)
      );
      const appHttpApiLayer = AppHttpApiLayer.pipe(
        HttpRouter.provideRequest(appHttpApiServices),
        Layer.provide(appHttpApiServices),
        Layer.provide(HttpServer.layerServices)
      );
      const appHttpApi = HttpEffect.toWebHandler(
        yield* HttpRouter.toHttpEffect(appHttpApiLayer),
        HttpMiddleware.logger
      );
      const healthHttpApi = HttpEffect.toWebHandler(
        yield* HttpRouter.toHttpEffect(
          HealthHttpApiLayer.pipe(Layer.provide(HttpServer.layerServices))
        ),
        HttpMiddleware.logger
      );

      app.use(
        evlog({
          // Effect owns routine response logging for requests crossing this bridge.
          exclude: ["/health", appHttpApiEvlogExcludePath],
        })
      );

      const identifyUser = createAuthMiddleware(auth.instance, {
        exclude: ["/api/auth/**"],
        maskEmail: true,
      });

      app.use("*", async (context, next) => {
        const log = context.get("log");
        if (log !== undefined) {
          await identifyUser(log, context.req.raw.headers, context.req.path);
        }
        // oxlint-disable-next-line typescript/no-confusing-void-expression -- Hono middleware must return its awaited next callback.
        return await next();
      });

      app.use(
        "/*",
        cors({
          allowHeaders: [
            "Content-Type",
            "Authorization",
            "b3",
            "traceparent",
            "tracestate",
            "baggage",
            "x-request-id",
          ],
          allowMethods: ["GET", "POST", "OPTIONS"],
          credentials: true,
          origin: startupConfig.corsOrigin,
        })
      );

      app.on(
        ["POST", "GET"],
        "/api/auth/*",
        async (context) => await auth.instance.handler(context.req.raw)
      );

      app.get("/api/openapi.json", (context) => {
        const log = context.get("log");
        if (log !== undefined) {
          log.set({ httpApi: { docs: "app-openapi" } });
        }
        return context.json(OpenApi.fromApi(AppHttpApi));
      });

      // oxlint-disable-next-line unicorn/consistent-function-scoping
      const handleHttpApiRequest = async <
        Path extends string,
        Input extends HonoInput,
      >(
        context: HonoContext<EvlogVariables, Path, Input>,
        handler: typeof appHttpApi
      ) => {
        const requestLog = context.get("log");
        const headers = new Headers(context.req.raw.headers);

        if (requestLog !== undefined) {
          const { requestId } = requestLog.getContext();

          if (Predicate.isString(requestId) && requestId.length > 0) {
            headers.set("x-request-id", requestId);
          }

          requestLog.set({ httpApi: { path: context.req.path } });
        }

        return await handler(new Request(context.req.raw, { headers }));
      };

      app.use(
        "/health",
        async (context) => await handleHttpApiRequest(context, healthHttpApi)
      );
      app.get("/", (context) => context.text("OK"));

      app.use(
        "*",
        async (context) => await handleHttpApiRequest(context, appHttpApi)
      );

      // oxlint-disable-next-line promise/prefer-await-to-callbacks
      app.onError((error, context) => {
        const log = context.get("log");
        if (log !== undefined) {
          log.error(error);
        }
        const parsed = parseError(error);
        const status = isContentfulStatusCode(parsed.status)
          ? parsed.status
          : 500;
        return context.json(
          {
            fix: parsed.fix,
            link: parsed.link,
            message: parsed.message,
            why: parsed.why,
          },
          status
        );
      });

      return ServerApplication.of({ app });
    })
  );

/** Build the scoped Hono application and all of its owned dependencies. */
export const makeServerApplicationLayer = (startupConfig: StartupConfig) => {
  const databaseLayer = makeSharedDatabaseLayer(startupConfig.databaseUrl);
  const authLayer = BetterAuthServiceLiveLayer.pipe(
    Layer.provide(Layer.succeed(AuthConfig, startupConfig.auth)),
    Layer.provide(databaseLayer)
  );
  const dependencies = Layer.merge(databaseLayer, authLayer);

  return makeHonoApplicationLayer(startupConfig).pipe(
    Layer.provide(dependencies)
  );
};

/** Minimal host resource owned by the server layer. */
export interface ServerControl {
  readonly stop: () => Promise<void>;
}

/**
 * Attach a scoped host to an application layer.
 *
 * The host is acquired last, so scope closure stops traffic before releasing
 * application handlers and their dependencies.
 */
export const makeServerHostLayer = <ApplicationError, HostError>(
  applicationLayer: Layer.Layer<ServerApplication, ApplicationError>,
  serve: (
    application: ServerApplicationService
  ) => Effect.Effect<ServerControl, HostError>
) =>
  Layer.effectDiscard(
    Effect.gen(function* acquireServerHost() {
      const application = yield* ServerApplication;
      yield* Effect.acquireRelease(serve(application), (server) =>
        Effect.promise(async () => {
          await server.stop();
        })
      );
    })
  ).pipe(Layer.provide(applicationLayer));

/** Build the complete long-lived server ownership graph. */
export const makeServerLayer = (startupConfig: StartupConfig) =>
  makeServerHostLayer(makeServerApplicationLayer(startupConfig), ({ app }) =>
    Effect.try({
      catch: (cause) => new ServerStartupError({ cause }),
      try: () =>
        Bun.serve({
          fetch: app.fetch,
          id: "tepirek-server",
        }),
    })
  );

interface HotModule {
  readonly dispose: (finalizer: () => Promise<void>) => void;
}

/** Interrupt a root Effect and await scope finalization during Bun hot reload. */
export const withHotReload = <A, E>(
  application: Effect.Effect<A, E>,
  hot: HotModule | undefined
): Effect.Effect<A | undefined, E> => {
  if (hot === undefined) {
    return application;
  }

  return Effect.gen(function* hotReloadBridge() {
    const reloadRequested = yield* Deferred.make<undefined>();
    const finalized = yield* Deferred.make<undefined>();
    const context = yield* Effect.context();
    const runPromise = Effect.runPromiseWith(context);

    hot.dispose(async () => {
      await runPromise(
        Deferred.completeWith(reloadRequested, Effect.undefined)
      );
      await runPromise(Deferred.await(finalized));
    });

    return yield* application.pipe(
      Effect.raceFirst(Deferred.await(reloadRequested)),
      Effect.ensuring(Deferred.completeWith(finalized, Effect.undefined))
    );
  });
};

const dotEnvProvider = ConfigProvider.fromDotEnv().pipe(
  Effect.catchIf(
    (error) => error.reason._tag === "NotFound",
    () => Effect.succeed(ConfigProvider.fromUnknown({}))
  ),
  Effect.provide(BunFileSystem.layer)
);

const startupConfigProvider = dotEnvProvider.pipe(
  Effect.map((provider) =>
    ConfigProvider.orElse(ConfigProvider.fromEnv(), provider)
  )
);

const startupConfigLayer = Layer.merge(
  AuthConfigLiveLayer,
  ConfigProvider.layer(startupConfigProvider)
);

const main = readStartupConfig.pipe(
  Effect.provide(startupConfigLayer),
  Effect.flatMap((startupConfig) =>
    Layer.launch(makeServerLayer(startupConfig)).pipe(
      Effect.provide(
        Observability.makeLayer(startupConfig.observability).pipe(
          Layer.provide(BunCrypto.layer)
        )
      )
    )
  ),
  (application) => withHotReload(application, import.meta.hot)
);

if (import.meta.main) {
  BunRuntime.runMain(main);
}

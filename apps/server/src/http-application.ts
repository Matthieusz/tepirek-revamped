import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { BetterAuthHttpRoutes } from "@tepirek-revamped/api/server/auth/http-routes";
import { makeApiLiveLayerFromDatabase } from "@tepirek-revamped/api/server/effect-app";
import { HealthHttpApiLayer } from "@tepirek-revamped/api/server/health/http-api-handlers";
import { AppHttpApiLayer } from "@tepirek-revamped/api/server/http-api-handlers";
import { BetterAuthService } from "@tepirek-revamped/auth";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import * as Context from "effect/Context";
import * as SecureRandom from "effect/crypto/SecureRandom";
import * as Effect from "effect/Effect";
import {
  Headers,
  HttpEffect,
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { OpenApi } from "effect/http-api";
import type { HttpServerError } from "effect/http/HttpServerError";
import * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import { routerLayer } from "evlog/effect";

import type { StartupConfig } from "./startup-config.ts";

/** Acquired routes and middleware shared by the Node host and HTTP tests. */
export interface ServerApplicationService {
  readonly httpEffect: Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    HttpServerError,
    HttpServerRequest.HttpServerRequest | Scope.Scope
  >;
  readonly middleware: typeof HttpMiddleware.logger;
}

/** Scoped HTTP application whose route dependencies remain alive until shutdown. */
export class ServerApplication extends Context.Service<
  ServerApplication,
  ServerApplicationService
>()("@tepirek-revamped/server/ServerApplication") {}

/** One redacted evlog wide event per routed request; replaces response-line logging. */
export const ServerRequestLoggingLayer = routerLayer({ redact: true });

/** Public process, health, and OpenAPI routes; none requires an authenticated session. */
export const ServerHttpRoutes = Layer.mergeAll(
  HealthHttpApiLayer,
  HttpRouter.add("GET", "/", HttpServerResponse.text("OK")),
  HttpRouter.add(
    "GET",
    "/api/openapi.json",
    Effect.sync(() =>
      HttpServerResponse.jsonUnsafe(OpenApi.fromApi(AppHttpApi))
    )
  )
);

/**
 * Build credentialed CORS and server-owned request correlation.
 * The response hook covers failures; the response map covers short-circuit preflights.
 */
export const makeServerMiddleware = (corsOrigin: string) =>
  Effect.gen(function* makeHttpMiddleware() {
    const random = yield* SecureRandom.SecureRandom;

    const cors = HttpMiddleware.cors({
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "b3",
        "traceparent",
        "tracestate",
        "baggage",
        "x-request-id",
      ],
      allowedMethods: ["GET", "POST", "OPTIONS"],
      allowedOrigins: (origin) => origin === corsOrigin,
      credentials: true,
      exposedHeaders: ["Retry-After", "x-request-id"],
    });

    return HttpMiddleware.make(
      <E, R>(
        app: Effect.Effect<
          HttpServerResponse.HttpServerResponse,
          E,
          R | HttpServerRequest.HttpServerRequest
        >
      ) =>
        Effect.gen(function* correlateRequest() {
          const request = yield* HttpServerRequest.HttpServerRequest;
          const requestId = yield* random.uuidV4();

          yield* HttpEffect.appendPreResponseHandler((_request, response) =>
            Effect.succeed(
              HttpServerResponse.setHeader(response, "x-request-id", requestId)
            )
          );
          yield* Effect.annotateCurrentSpan("request.id", requestId);

          return yield* cors(app).pipe(
            Effect.map((response) =>
              HttpServerResponse.setHeader(response, "x-request-id", requestId)
            ),
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              request.modify({
                headers: Headers.set(
                  request.headers,
                  "x-request-id",
                  requestId
                ),
              })
            ),
            Effect.annotateLogs({ requestId }),
            Effect.annotateSpans("request.id", requestId)
          );
        })
    );
  });

/** Acquire the single router containing public, auth, and application routes. */
export const buildHttpApplicationLayer = (startupConfig: StartupConfig) =>
  Layer.effect(
    ServerApplication,
    Effect.gen(function* makeHttpApplication() {
      const database = yield* EffectDatabase;
      const auth = yield* BetterAuthService;

      const apiLiveLayer = makeApiLiveLayerFromDatabase(
        Layer.succeed(EffectDatabase, database),
        {
          discordGuildId: startupConfig.discordGuildId,
          firecrawl: startupConfig.firecrawl,
        }
      );

      const applicationServices = Layer.merge(
        apiLiveLayer,
        Layer.succeed(BetterAuthService, auth)
      );

      const routes = Layer.mergeAll(
        AppHttpApiLayer,
        BetterAuthHttpRoutes,
        ServerHttpRoutes
      ).pipe(
        HttpRouter.provideRequest(applicationServices),
        Layer.provide(applicationServices),
        Layer.provide(NodeHttpServer.layerHttpServices),
        Layer.provide(ServerRequestLoggingLayer)
      );

      const httpEffect = yield* HttpRouter.toHttpEffect(routes);
      const middleware = yield* makeServerMiddleware(startupConfig.corsOrigin);

      return ServerApplication.of({ httpEffect, middleware });
    })
  );

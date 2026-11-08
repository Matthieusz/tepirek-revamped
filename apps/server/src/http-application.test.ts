import { createServer } from "node:http";

import * as NodeCrypto from "@effect/platform-node/NodeCrypto";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import { expect, it } from "@effect/vitest";
import { BetterAuthHttpRoutes } from "@tepirek-revamped/api/server/auth/http-routes";
import {
  buildBetterAuthServiceLayer,
  createAuth,
} from "@tepirek-revamped/auth";
import { makeTestBetterAuthDatabase } from "@tepirek-revamped/db/test";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import type { WideEvent } from "evlog";
import { EvlogLogger, initLoggerLayer } from "evlog/effect";

import {
  makeServerMiddleware,
  ServerApplication,
  ServerHttpRoutes,
  ServerRequestLoggingLayer,
} from "./http-application.ts";
import { makeServerHostLayer } from "./index.ts";

const requestIdPattern = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu;

const corsOrigin = "http://localhost:3001";

const traceId = "12345678901234567890123456789012";

const authLayer = Layer.unwrap(
  Effect.gen(function* testAuth() {
    const database = yield* makeTestBetterAuthDatabase(
      "postgresql://postgres:password@localhost:5433/tepirek-revamped-test"
    );

    const instance = createAuth(
      {
        betterAuthSecret: Redacted.make("test-secret-at-least-32-characters"),
        betterAuthUrl: new URL("http://localhost:3000"),
        corsOrigin: new URL(corsOrigin),
        discordClientId: "test-discord-client-id",
        discordClientSecret: Redacted.make("test-discord-client-secret"),
        isProduction: false,
      },
      database
    );

    return buildBetterAuthServiceLayer({
      ...instance,
      handler: async (request) => {
        if (request.method === "DELETE") {
          return new Response("vendor response", { status: 405 });
        }

        expect(request.method).toBe("POST");
        expect(new URL(request.url).pathname).toBe("/api/auth/callback/test");
        expect(new URL(request.url).search).toBe("?code=test");
        expect(await request.text()).toBe("callback-body");
        expect(request.headers.get("cookie")).toBe("state=private-cookie");
        const headers = new Headers({ location: "/dashboard" });
        headers.append("set-cookie", "session=test; Path=/; HttpOnly");
        headers.append("set-cookie", "state=; Path=/; Max-Age=0");

        return new Response(null, { headers, status: 302 });
      },
    });
  })
);

const routes = Layer.mergeAll(
  ServerHttpRoutes,
  HttpRouter.add(
    "GET",
    "/correlation",
    Effect.gen(function* echoCorrelation() {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const log = yield* EvlogLogger;
      log.set({ operation: "correlation" });

      return HttpServerResponse.text(
        request.headers["x-request-id"] ?? "missing"
      );
    })
  ),
  HttpRouter.add("GET", "/failure", Effect.die(new Error("handler failed"))),
  BetterAuthHttpRoutes.pipe(Layer.provide(authLayer))
).pipe(
  Layer.provide(ServerRequestLoggingLayer),
  Layer.provide(HttpServer.layerServices)
);

const withHttpApplication = <A>(
  runWith: (
    request: (path: string, init?: RequestInit) => Promise<Response>,
    events: WideEvent[]
  ) => Effect.Effect<A>
) =>
  Effect.gen(function* acquireHttpApplication() {
    const events: WideEvent[] = [];
    yield* Layer.build(
      initLoggerLayer({
        drain: (context) => {
          events.push(context.event);
        },
        env: { service: "server-test" },
        silent: true,
      })
    );
    const middleware = yield* makeServerMiddleware(corsOrigin);
    const httpEffect = yield* HttpRouter.toHttpEffect(routes);

    const context = yield* Layer.build(
      makeServerHostLayer(
        Layer.succeed(
          ServerApplication,
          ServerApplication.of({ httpEffect, middleware })
        ),
        NodeHttpServer.layerServer(createServer, { host: "127.0.0.1", port: 0 })
      )
    );

    const server = Context.get(context, HttpServer.HttpServer);
    const baseUrl = HttpServer.formatAddress(server.address);

    return yield* runWith(
      async (path, init) =>
        await fetch(new URL(path, baseUrl), { ...init, redirect: "manual" }),
      events
    );
  }).pipe(Effect.provide(NodeCrypto.layer));

it.live("serves public routes without application services", () =>
  withHttpApplication((request) =>
    Effect.gen(function* publicRoutes() {
      for (const [path, expectedBody] of [
        ["/", "OK"],
        ["/health", '"OK"'],
      ] as const) {
        const response = yield* Effect.promise(async () => await request(path));
        expect(response.status).toBe(200);
        expect(yield* Effect.promise(async () => await response.text())).toBe(
          expectedBody
        );
      }

      const response = yield* Effect.promise(
        async () => await request("/api/openapi.json")
      );

      expect(response.status).toBe(200);
      expect(
        yield* Effect.promise(async () => await response.text())
      ).toContain('"openapi"');
    })
  )
);

it.live(
  "correlates one redacted evlog event with a server-owned ID and incoming trace",
  () =>
    withHttpApplication((request, events) =>
      Effect.gen(function* requestCorrelation() {
        const response = yield* Effect.promise(
          async () =>
            await request("/correlation?token=private-query", {
              headers: {
                Origin: corsOrigin,
                authorization: "Bearer private-credential",
                cookie: "session=private-cookie",
                traceparent: `00-${traceId}-1234567890123456-01`,
                "x-request-id": "untrusted-client-id",
              },
            })
        );

        const requestId = response.headers.get("x-request-id");
        expect(requestId).toMatch(requestIdPattern);
        expect(yield* Effect.promise(async () => await response.text())).toBe(
          requestId
        );
        expect(response.headers.get("access-control-allow-origin")).toBe(
          corsOrigin
        );
        expect(response.headers.get("access-control-allow-credentials")).toBe(
          "true"
        );
        expect(response.headers.get("access-control-expose-headers")).toBe(
          "Retry-After,x-request-id"
        );
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
          operation: "correlation",
          path: "/correlation",
          requestId,
          status: 200,
          traceId,
        });

        for (const secret of [
          "private-query",
          "private-cookie",
          "private-credential",
          "untrusted-client-id",
        ]) {
          expect(JSON.stringify(events)).not.toContain(secret);
        }
      })
    )
);

it.live("short-circuits preflight and rejects untrusted CORS origins", () =>
  withHttpApplication((request, events) =>
    Effect.gen(function* corsPolicy() {
      const preflight = yield* Effect.promise(
        async () =>
          await request("/correlation", {
            headers: {
              Origin: corsOrigin,
              "access-control-request-headers": "content-type,traceparent",
              "access-control-request-method": "POST",
            },
            method: "OPTIONS",
          })
      );

      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("access-control-allow-origin")).toBe(
        corsOrigin
      );
      expect(preflight.headers.get("access-control-allow-methods")).toBe(
        "GET, POST, OPTIONS"
      );
      expect(preflight.headers.get("access-control-allow-headers")).toContain(
        "traceparent"
      );
      expect(preflight.headers.get("x-request-id")).toMatch(requestIdPattern);
      expect(events).toHaveLength(0);

      const untrusted = yield* Effect.promise(
        async () =>
          await request("/", {
            headers: { Origin: "https://untrusted.example" },
          })
      );

      expect(untrusted.headers.get("access-control-allow-origin")).toBeNull();
      expect(untrusted.headers.get("vary")).toContain("Origin");
      yield* Effect.promise(async () => await untrusted.text());
    })
  )
);

it.live(
  "preserves error statuses, CORS, and correlation without leaking request secrets",
  () =>
    withHttpApplication((request, events) =>
      Effect.gen(function* failureResponses() {
        for (const [path, status] of [
          ["/missing", 404],
          ["/failure", 500],
        ] as const) {
          const response = yield* Effect.promise(
            async () =>
              await request(`${path}?token=private-error-query`, {
                headers: {
                  Origin: corsOrigin,
                  cookie: "session=private-error-cookie",
                },
              })
          );

          expect(response.status).toBe(status);
          expect(response.headers.get("x-request-id")).toMatch(
            requestIdPattern
          );
          expect(response.headers.get("access-control-allow-origin")).toBe(
            corsOrigin
          );
          expect(
            yield* Effect.promise(async () => await response.text())
          ).not.toContain("handler failed");
        }

        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({ status: 404 });
        expect(events[1]).toMatchObject({ status: 500 });
        expect(JSON.stringify(events)).not.toContain("private-error-query");
        expect(JSON.stringify(events)).not.toContain("private-error-cookie");
      })
    )
);

it.live(
  "delegates auth methods and preserves callback bodies, redirects, and cookies",
  () =>
    withHttpApplication((request, events) =>
      Effect.gen(function* authCallback() {
        const response = yield* Effect.promise(
          async () =>
            await request("/api/auth/callback/test?code=test", {
              body: "callback-body",
              headers: { cookie: "state=private-cookie" },
              method: "POST",
            })
        );

        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/dashboard");
        expect(
          response.headers
            .getSetCookie()
            .map((cookie) => new Set(cookie.split("; ")))
        ).toEqual([
          new Set(["session=test", "Path=/", "HttpOnly"]),
          new Set(["state=", "Path=/", "Max-Age=0"]),
        ]);
        yield* Effect.promise(async () => await response.text());
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({ status: 302 });
        expect(JSON.stringify(events)).not.toContain("private-cookie");
        expect(JSON.stringify(events)).not.toContain("callback-body");

        const unsupported = yield* Effect.promise(
          async () => await request("/api/auth/unknown", { method: "DELETE" })
        );

        expect(unsupported.status).toBe(405);
        expect(
          yield* Effect.promise(async () => await unsupported.text())
        ).toBe("vendor response");
      })
    )
);

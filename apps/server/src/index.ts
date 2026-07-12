import "dotenv/config";
import * as Observability from "@tepirek-revamped/api/observability";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { makeBetterAuthAdapterLayer } from "@tepirek-revamped/api/server/auth/better-auth-adapter";
import { makeApiLiveLayerFromValues } from "@tepirek-revamped/api/server/effect-app";
import { HealthHttpApiLayer } from "@tepirek-revamped/api/server/health/http-api-handlers";
import { AppHttpApiLayer } from "@tepirek-revamped/api/server/http-api-handlers";
import { AuthConfigLiveLayer, createAuth } from "@tepirek-revamped/auth";
import { createDatabase } from "@tepirek-revamped/db";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { OpenApi } from "effect/unstable/httpapi";
import { initLogger, parseError } from "evlog";
import { createAuthMiddleware } from "evlog/better-auth";
import type { BetterAuthInstance } from "evlog/better-auth";
import { evlog } from "evlog/hono";
import type { EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { makeShutdown } from "./server-lifecycle.js";
import { readStartupConfig } from "./startup-config.js";

initLogger({
  env: { service: "tepirek-server" },
});

const app = new Hono<EvlogVariables>();

// The Hono host is the executable adapter boundary: all environment values
// are parsed here before handlers or traffic can start. Observability remains
// an adapter concern because its values configure external OTLP transports.
const startupConfig = Effect.runSync(
  readStartupConfig.pipe(Effect.provide(AuthConfigLiveLayer))
);
const { corsOrigin } = startupConfig;
const { database, pool: dbPool } = createDatabase(
  Redacted.value(startupConfig.databaseUrl)
);
const auth = createAuth(startupConfig.auth, database);

// SAFETY: The production layer immediately provides the squad-builder services
// and HttpServer services required by the HttpApi layer before it reaches
// toWebHandler; this narrows the exported web handler to the Hono boundary.
const appHttpApiLayer = AppHttpApiLayer.pipe(
  Layer.provideMerge(
    makeApiLiveLayerFromValues({
      databaseUrl: Redacted.value(startupConfig.databaseUrl),
      discordGuildId: startupConfig.discordGuildId,
      firecrawl: startupConfig.firecrawl,
    })
  ),
  Layer.provideMerge(makeBetterAuthAdapterLayer(auth)),
  Layer.provide(HttpServer.layerServices),
  Layer.provide(Observability.makeLayer(startupConfig.observability))
);

const appHttpApi = HttpRouter.toWebHandler(appHttpApiLayer, {
  disableLogger: true,
});

const healthHttpApiLayer = HealthHttpApiLayer.pipe(
  Layer.provide(HttpServer.layerServices)
);

const healthHttpApi = HttpRouter.toWebHandler(healthHttpApiLayer, {
  disableLogger: true,
});

/** Release every process-owned server resource exactly once. */
export const shutdown = makeShutdown([
  { dispose: appHttpApi.dispose },
  { dispose: healthHttpApi.dispose },
  { dispose: () => dbPool.end() },
]);

/** Gracefully stop the host and release all composition-root resources. */
export const stopServer = async (
  server: Bun.Server<unknown>
): Promise<void> => {
  try {
    await server.stop();
    await shutdown();
  } catch (error) {
    console.error("Failed to shut down server resources", error);
    throw error;
  }
};

/**
 * Start the Hono-hosted Bun server and make this composition root own shutdown.
 */
export const startServer = async (): Promise<Bun.Server<unknown>> => {
  let server: Bun.Server<unknown>;
  try {
    server = Bun.serve({
      fetch: app.fetch,
      id: "tepirek-server",
    });
  } catch (error) {
    await shutdown();
    throw error;
  }

  const handleShutdownSignal = async (): Promise<void> => {
    try {
      await stopServer(server);
      process.exit(0);
    } catch {
      process.exit(1);
    }
  };

  process.once("SIGINT", handleShutdownSignal);
  process.once("SIGTERM", handleShutdownSignal);

  if (import.meta.hot) {
    import.meta.hot.dispose(async () => {
      process.off("SIGINT", handleShutdownSignal);
      process.off("SIGTERM", handleShutdownSignal);
      await stopServer(server);
    });
  }

  return server;
};

app.use(evlog());

// Identify the authenticated user from the better-auth session and attach
// user context to every request's wide event. Skips auth routes (where a
// session is being established) and masks emails in logs.
const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

app.use("*", async (c, next) => {
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
  return next();
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
    origin: corsOrigin,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/api/openapi.json", (c) => {
  c.get("log").set({ httpApi: { docs: "app-openapi" } });
  return c.json(OpenApi.fromApi(AppHttpApi));
});

const handleHttpApiRequest = async (
  c: Context<EvlogVariables>,
  handler: typeof appHttpApi
) => {
  const requestLog = c.get("log");
  const { requestId } = requestLog.getContext();
  const headers = new Headers(c.req.raw.headers);

  if (typeof requestId === "string" && requestId.length > 0) {
    headers.set("x-request-id", requestId);
  }

  requestLog.set({ httpApi: { path: c.req.path } });
  const response = await handler.handler(new Request(c.req.raw, { headers }));

  return response;
};

app.use("/health", (c) => handleHttpApiRequest(c, healthHttpApi));
app.use("/announcements/*", (c) => handleHttpApiRequest(c, appHttpApi));
app.use("/todos/*", (c) => handleHttpApiRequest(c, appHttpApi));
app.use("/heroes/*", (c) => handleHttpApiRequest(c, appHttpApi));
app.use("/events/*", (c) => handleHttpApiRequest(c, appHttpApi));
app.use("/skills/*", (c) => handleHttpApiRequest(c, appHttpApi));
app.use("/auction/*", (c) => handleHttpApiRequest(c, appHttpApi));
app.use("/bet/*", (c) => handleHttpApiRequest(c, appHttpApi));
app.use("/ranking/*", (c) => handleHttpApiRequest(c, appHttpApi));
app.use("/user/*", (c) => handleHttpApiRequest(c, appHttpApi));
app.use("/vault/*", (c) => handleHttpApiRequest(c, appHttpApi));
app.use("/squad-builder/*", (c) => handleHttpApiRequest(c, appHttpApi));

app.get("/", (c) => c.text("OK"));

// oxlint-disable-next-line promise/prefer-await-to-callbacks
app.onError((error, c) => {
  c.get("log").error(error);
  const parsed = parseError(error);
  return c.json(
    {
      fix: parsed.fix,
      link: parsed.link,
      message: parsed.message,
      why: parsed.why,
    },
    parsed.status as ContentfulStatusCode
  );
});

export { app };

if (import.meta.main) {
  await startServer();
}

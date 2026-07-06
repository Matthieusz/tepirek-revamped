import "dotenv/config";
import {
  makeApiLiveLayer,
  makeApiRuntime,
} from "@tepirek-revamped/api/effect-app";
import * as Observability from "@tepirek-revamped/api/observability";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { HealthHttpApiLayer } from "@tepirek-revamped/api/server/health/http-api-handlers";
import { AppHttpApiLayer } from "@tepirek-revamped/api/server/http-api-handlers";
import { auth } from "@tepirek-revamped/auth";
import * as Layer from "effect/Layer";
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

initLogger({
  env: { service: "tepirek-server" },
});

const app = new Hono<EvlogVariables>();

const corsOrigin = process.env.CORS_ORIGIN;

if (!corsOrigin) {
  throw new Error("CORS_ORIGIN environment variable is required");
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Effect's default ConfigProvider snapshots process.env on first read. This
// server reads required env at startup and builds long-lived runtimes from those
// values. If a listener/request-app construction ever needs to re-read env after
// startup (for example in tests that mutate process.env), provide
// ConfigProvider.layer(ConfigProvider.fromEnv()) at that construction boundary.
/** Shared Effect runtime for migrated API modules. */
export const apiEffectRuntime = makeApiRuntime(databaseUrl);

export const disposeApiEffectRuntime = async (): Promise<void> => {
  await apiEffectRuntime.dispose();
};

// SAFETY: The production layer immediately provides the squad-builder services
// and HttpServer services required by the HttpApi layer before it reaches
// toWebHandler; this narrows the exported web handler to the Hono boundary.
const appHttpApiLayer = AppHttpApiLayer.pipe(
  Layer.provide(makeApiLiveLayer(databaseUrl)),
  Layer.provide(HttpServer.layerServices),
  Layer.provideMerge(Observability.layer)
) as Layer.Layer<HttpRouter.HttpRouter>;

const appHttpApi = HttpRouter.toWebHandler(appHttpApiLayer, {
  disableLogger: true,
});

const healthHttpApiLayer = HealthHttpApiLayer.pipe(
  Layer.provide(HttpServer.layerServices)
) as Layer.Layer<HttpRouter.HttpRouter>;

const healthHttpApi = HttpRouter.toWebHandler(healthHttpApiLayer, {
  disableLogger: true,
});

export const disposeAppHttpApi = async (): Promise<void> => {
  await appHttpApi.dispose();
  await healthHttpApi.dispose();
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
    allowHeaders: ["Content-Type", "Authorization"],
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

export default app;

import "dotenv/config";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@tepirek-revamped/api/context";
import { makeApiLiveLayer } from "@tepirek-revamped/api/effect-app";
import { appRouter } from "@tepirek-revamped/api/routers/index";
import { auth } from "@tepirek-revamped/auth";
import { ManagedRuntime } from "effect";
import { createError, initLogger, log as evlogLog, parseError } from "evlog";
import { createAuthMiddleware } from "evlog/better-auth";
import type { BetterAuthInstance } from "evlog/better-auth";
import { evlog } from "evlog/hono";
import type { EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
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

/** Shared Effect runtime for migrated API modules. */
export const apiEffectRuntime = ManagedRuntime.make(
  makeApiLiveLayer(databaseUrl)
);

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

// Demo route: shows a request-scoped wide event via the evlog Hono middleware.
// `c.get('log')` is the Hono equivalent of `useLogger(event)` — the middleware
// creates one request logger per request and emits a single wide event on
// response completion.
app.post("/api/echo", async (c) => {
  const log = c.get("log");

  let body: { text?: unknown };
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const text = body?.text;
  log.set({ input: { text } });

  if (typeof text !== "string" || text.trim().length === 0) {
    throw createError({
      fix: 'Send a JSON body like { "text": "hello" }',
      message: "text is required",
      status: 400,
      why: "The `text` field was missing or empty in the request body",
    });
  }

  log.set({ echo: { length: text.length } });
  return c.json({ text });
});

export const apiHandler = new OpenAPIHandler(appRouter, {
  interceptors: [
    // oxlint-disable-next-line promise/prefer-await-to-callbacks
    onError((error) => {
      evlogLog.error({ error, handler: "openapi" });
    }),
  ],
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    // oxlint-disable-next-line promise/prefer-await-to-callbacks
    onError((error) => {
      evlogLog.error({ error, handler: "rpc" });
    }),
  ],
});

app.use("/rpc/*", async (c, next) => {
  const context = await createContext({ context: c });
  const requestLog = c.get("log");

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    context,
    prefix: "/rpc",
  });

  if (rpcResult.matched) {
    requestLog.set({ rpc: { path: c.req.path } });
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  return next();
});

app.use("/api-reference/*", async (c, next) => {
  const context = await createContext({ context: c });
  const requestLog = c.get("log");

  const apiResult = await apiHandler.handle(c.req.raw, {
    context,
    prefix: "/api-reference",
  });

  if (apiResult.matched) {
    requestLog.set({ openapi: { path: c.req.path } });
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  return next();
});

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

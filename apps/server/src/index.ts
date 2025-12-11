import "dotenv/config";
import { randomUUID } from "node:crypto";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@tepirek-revamped/api/context";
import { appRouter } from "@tepirek-revamped/api/routers/index";
import { auth } from "@tepirek-revamped/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { type Logger, logger } from "./logger";

const app = new Hono<{
  Variables: {
    logger: Logger;
  };
}>();

app.use("*", async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? randomUUID();
  const requestLogger = logger.child({
    requestId,
    method: c.req.method,
    path: c.req.path,
  });

  c.set("logger", requestLogger);
  c.header("x-request-id", requestId);

  const start = performance.now();

  try {
    await next();
    const durationMs = Math.round(performance.now() - start);
    requestLogger.info(
      {
        durationMs,
        status: c.res?.status ?? 200,
      },
      "request completed"
    );
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    requestLogger.error(
      {
        durationMs,
        err: error,
      },
      "request failed"
    );
    throw error;
  }
});

app.use(
  "/*",
  cors({
    origin: process.env.CORS_ORIGIN || "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      logger.error({ err: error }, "openapi handler error");
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      logger.error({ err: error }, "rpc handler error");
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });
  const requestLogger = c.get("logger") ?? logger;

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    requestLogger.debug({ path: c.req.path }, "rpc request handled");
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context,
  });

  if (apiResult.matched) {
    requestLogger.debug({ path: c.req.path }, "openapi request handled");
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.get("/", (c) => c.text("OK"));

export default app;

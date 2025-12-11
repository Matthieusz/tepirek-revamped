import { auth } from "@tepirek-revamped/auth";
import type { Context as HonoContext } from "hono";
import type { Logger } from "pino";

export type CreateContextOptions = {
  context: HonoContext<{
    Variables: {
      logger: Logger;
    };
  }>;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    session,
    logger: context.get("logger"),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

import { auth } from "@tepirek-revamped/auth";
import type { Context as HonoContext } from "hono";
import type { Logger } from "pino";

export interface CreateContextOptions {
  context: HonoContext<{
    Variables: {
      logger: Logger;
    };
  }>;
}

export const createContext = async ({ context }: CreateContextOptions) => {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    logger: context.get("logger"),
    session,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

import { auth } from "@tepirek-revamped/auth";
import type { EvlogVariables } from "evlog/hono";
import type { Context as HonoContext } from "hono";

export interface CreateContextOptions {
  context: HonoContext<EvlogVariables>;
}

export const createContext = async ({ context }: CreateContextOptions) => {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    logger: context.get("log"),
    session,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

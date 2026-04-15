import { ORPCError, os } from "@orpc/server";
import type { auth } from "@tepirek-revamped/auth";
import type { Logger } from "pino";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export interface RouterContext {
  logger: Logger;
  session: Session;
}

const o = os.$context<RouterContext>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireAdmin = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  if (context.session.user.role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const adminProcedure = publicProcedure.use(requireAdmin);

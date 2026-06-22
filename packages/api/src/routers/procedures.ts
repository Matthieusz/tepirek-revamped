import { ORPCError, os } from "@orpc/server";
import type { auth } from "@tepirek-revamped/auth";
import type { RequestLogger } from "evlog";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export interface RouterContext {
  logger: RequestLogger;
  session: Session;
}

const o = os.$context<RouterContext>();

export const publicProcedure = o;

interface SessionAuthorizationState {
  user: {
    role?: string | null;
    verified: boolean;
  };
}

export const isVerifiedSession = (
  session: SessionAuthorizationState | null
): boolean => session?.user.verified === true;

export const isAdminSession = (
  session: SessionAuthorizationState | null
): boolean => isVerifiedSession(session) && session?.user.role === "admin";

const requireAuth = o.middleware(({ context, next }) => {
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

const requireVerified = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  if (!isVerifiedSession(context.session)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Konto oczekuje na weryfikację",
    });
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const verifiedProcedure = protectedProcedure.use(requireVerified);

const requireAdmin = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  if (!isVerifiedSession(context.session)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Konto oczekuje na weryfikację",
    });
  }
  if (!isAdminSession(context.session)) {
    throw new ORPCError("FORBIDDEN");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const adminProcedure = publicProcedure.use(requireAdmin);

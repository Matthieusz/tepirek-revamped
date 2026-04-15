import { redirect } from "@tanstack/react-router";

import { getUser } from "@/functions/get-user";
import type { AuthSession } from "@/types/route";

export interface PageProps {
  session: AuthSession;
}

export const requireAuth = async (): Promise<AuthSession> => {
  const session = await getUser();
  if (!session?.user) {
    throw redirect({ to: "/login" });
  }
  return session;
};

/**
 * Requires user to be authenticated AND verified.
 * Redirects to /login if not authenticated.
 * Redirects to /waiting-room if not verified.
 */
export const requireVerified = async (): Promise<AuthSession> => {
  const session = await requireAuth();
  if (!session.user.verified) {
    throw redirect({ to: "/waiting-room" });
  }
  return session;
};

/**
 * Requires user to be authenticated but NOT verified.
 * Used for waiting-room route.
 * Redirects to /login if not authenticated.
 * Redirects to /dashboard if already verified.
 */
export const requireUnverified = async (): Promise<AuthSession> => {
  const session = await requireAuth();
  if (session.user.verified) {
    throw redirect({ to: "/dashboard" });
  }
  return session;
};

export const isAdmin = (session: AuthSession): boolean =>
  session.user.role === "admin";

import { isRedirect, redirect } from "@tanstack/react-router";
import { getUser } from "@/functions/get-user";

export type AuthSession = Awaited<ReturnType<typeof getUser>>;
export type AuthUser = NonNullable<AuthSession>["user"];

/** Context type returned by dashboard route's beforeLoad */
export type DashboardRouteContext = {
  session: AuthUser;
};

/**
 * Requires user to be authenticated.
 * Redirects to /login if not authenticated.
 */
export async function requireAuth() {
  try {
    const session = await getUser();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    return session;
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }
    throw redirect({ to: "/login" });
  }
}

/**
 * Requires user to be authenticated AND verified.
 * Redirects to /login if not authenticated.
 * Redirects to /waiting-room if not verified.
 */
export async function requireVerified() {
  const session = await requireAuth();
  if (!session.user.verified) {
    throw redirect({ to: "/waiting-room" });
  }
  return session;
}

/**
 * Requires user to be authenticated but NOT verified.
 * Used for waiting-room route.
 * Redirects to /login if not authenticated.
 * Redirects to /dashboard if already verified.
 */
export async function requireUnverified() {
  const session = await requireAuth();
  if (session.user.verified) {
    throw redirect({ to: "/dashboard" });
  }
  return session;
}

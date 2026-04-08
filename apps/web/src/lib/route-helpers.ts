import { redirect } from "@tanstack/react-router";

import { getUser } from "@/functions/get-user";
import type { AuthSession } from "@/types/route";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Props passed to page components
 */
export interface PageProps {
  session: AuthSession;
}

// ============================================================================
// Auth Guards
// ============================================================================

/**
 * Requires user to be authenticated.
 * Redirects to /login if not authenticated.
 */
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

/**
 * Requires user to NOT be authenticated.
 * Redirects to /dashboard if already logged in.
 */
export const requireGuest = async (): Promise<void> => {
  const session = await getUser();
  if (session?.user) {
    throw redirect({ to: "/dashboard" });
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if the user is an admin
 */
export const isAdmin = (session: AuthSession): boolean =>
  session.user.role === "admin";

/**
 * Checks if the user is verified
 */
export const isVerified = (session: AuthSession): boolean =>
  session.user.verified;

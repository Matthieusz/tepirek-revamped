import type { BetterAuthInstance } from "@tepirek-revamped/auth";

/**
 * Session type inferred from Better Auth
 * Uses auth.$Infer.Session to get the exact types from the auth configuration
 */
export interface AuthSession {
  session: BetterAuthInstance["$Infer"]["Session"]["session"];
  user: BetterAuthInstance["$Infer"]["Session"]["user"];
}

/**
 * User portion of the authenticated session, used when only user data is needed
 */
export type AuthUser = AuthSession["user"];

/**
 * Session type that can be null when unauthenticated
 */
export type UserSession = AuthSession | null;

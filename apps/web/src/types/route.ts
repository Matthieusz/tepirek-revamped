import type { Auth } from "@tepirek-revamped/auth";

/**
 * Session type inferred from Better Auth
 * Uses auth.$Infer.Session to get the exact types from the auth configuration
 */
export interface AuthSession {
  session: Auth["$Infer"]["Session"]["session"];
  user: Auth["$Infer"]["Session"]["user"];
}

/**
 * User portion of the authenticated session, used when only user data is needed
 */
export type AuthUser = AuthSession["user"];

/**
 * Session type that can be null when unauthenticated
 */
export type UserSession = AuthSession | null;

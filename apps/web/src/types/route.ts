import type { Auth } from "@tepirek-revamped/auth";

/**
 * Static data attached to routes for breadcrumbs and metadata
 */
export interface RouteStaticData {
  /** Breadcrumb label */
  crumb?: string;
}

/**
 * Context available in the router application
 */
export type RouterAppContext = Record<string, never>;

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

/**
 * Context returned by dashboard route's beforeLoad
 */
export interface DashboardRouteContext {
  session: AuthSession;
}

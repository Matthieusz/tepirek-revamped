import { createMiddleware } from "@tanstack/react-start";
import type { auth } from "@tepirek-revamped/auth";

import { authClient } from "@/lib/auth-client";

export type AuthSession = {
  session: typeof auth.$Infer.Session.session;
  user: typeof auth.$Infer.Session.user;
} | null;

// Simple in-memory cache for session to prevent excessive Better Auth API calls
// Cache is per-request on server, so we use a Map keyed by cookie signature
const sessionCache = new Map<
  string,
  {
    session: AuthSession;
    expires: number;
  }
>();
// 30 seconds cache
const CACHE_TTL = 30 * 1000;

const getCacheKey = (request: Request): string => {
  const cookie = request.headers.get("cookie") || "";
  const authCookies = cookie
    .split(";")
    .filter((c) => c.trim().startsWith("better-auth"))
    .join(";");
  return authCookies;
};

const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of sessionCache) {
    if (value.expires < now) {
      sessionCache.delete(key);
    }
  }
};

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const cacheKey = getCacheKey(request);

    // Check cache first
    const cached = sessionCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return next({
        context: { session: cached.session },
      });
    }

    // Clean expired entries periodically
    if (sessionCache.size > 100) {
      cleanExpiredCache();
    }

    const session = await authClient.getSession({
      fetchOptions: {
        headers: request.headers,
        throw: true,
      },
    });

    // Cache the session
    if (cacheKey) {
      sessionCache.set(cacheKey, {
        expires: Date.now() + CACHE_TTL,
        session,
      });
    }

    return next({
      context: { session },
    });
  }
);

import { createMiddleware } from "@tanstack/react-start";

import { authClient } from "@/lib/auth-client";
import type { UserSession } from "@/types/route";

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const session: UserSession = await authClient.getSession({
      fetchOptions: {
        headers: request.headers,
        throw: true,
      },
    });

    return next({
      context: { session },
    });
  }
);

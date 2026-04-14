import { createMiddleware } from "@tanstack/react-start";

import { authClient } from "@/lib/auth-client";
import type { MaybeAuthSession } from "@/types/route";

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const session: MaybeAuthSession = await authClient.getSession({
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

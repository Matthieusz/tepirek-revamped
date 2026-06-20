import { createRouterClient } from "@orpc/server";

import { appRouter } from "../../routers";
import type { RouterContext } from "../../routers/procedures";
import type { TestUser } from "./builders";

export const createUnauthenticatedRouterClient = () =>
  createRouterClient(appRouter, {
    context: {
      logger: {} as RouterContext["logger"],
      session: null,
    } as RouterContext,
  });

export const createAuthenticatedRouterClient = (user: TestUser) =>
  createRouterClient(appRouter, {
    context: {
      logger: {} as RouterContext["logger"],
      session: {
        session: {
          id: `${user.id}-session`,
          token: `${user.id}-token`,
          userId: user.id,
        },
        user: {
          id: user.id,
          role: user.role,
          verified: user.verified,
        },
      },
    } as RouterContext,
  });

// @vitest-environment happy-dom

import { createMemoryHistory, isRedirect } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CaughtError } from "@/lib/errors";
import { invokeRouteHook } from "@/lib/test-utils/route-option-test-utils";
import { getRouter } from "@/router";
import type { RouterAppContext } from "@/routes/__root";
import { Route } from "@/routes/dashboard/route";
import type { UserSession } from "@/types/route";

const getUser = vi.fn<RouterAppContext["getUser"]>();

const makeSession = (verified: boolean): Exclude<UserSession, null> => ({
  session: {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    id: "session-id",
    ipAddress: null,
    token: "session-token",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    userAgent: null,
    userId: "user-id",
  },
  user: {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    email: "guild@example.com",
    emailVerified: true,
    id: "user-id",
    image: null,
    name: "Guild Member",
    role: "user",
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    verified,
  },
});

const runDashboardGuard = async () => {
  const router = getRouter();
  router.update({
    context: { ...router.options.context, getUser },
    history: createMemoryHistory({ initialEntries: ["/"] }),
    isServer: false,
  });

  const { beforeLoad } = Route.options;
  if (!beforeLoad) {
    throw new Error("Dashboard route must define beforeLoad");
  }

  // SAFETY: this callback only reads the supplied router context.
  return await invokeRouteHook(beforeLoad, {
    context: router.options.context,
  } as Parameters<typeof beforeLoad>[0]);
};

describe("dashboard authentication", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("disables SSR for the authenticated route branch", () => {
    expect(Route.options.ssr).toBe(false);
  });

  it("redirects an unauthenticated visitor to login", async () => {
    getUser.mockResolvedValue(null);

    const error = await runDashboardGuard().catch(
      (caughtError: CaughtError) => caughtError
    );

    expect(isRedirect(error)).toBe(true);
    expect(error).toMatchObject({ options: { to: "/login" } });
  });

  it("redirects an unverified member to the waiting room", async () => {
    getUser.mockResolvedValue(makeSession(false));

    const error = await runDashboardGuard().catch(
      (caughtError: CaughtError) => caughtError
    );

    expect(isRedirect(error)).toBe(true);
    expect(error).toMatchObject({ options: { to: "/waiting-room" } });
  });

  it("exposes a verified member session through route context", async () => {
    const session = makeSession(true);
    getUser.mockResolvedValue(session);

    await expect(runDashboardGuard()).resolves.toEqual({ session });
  });
});

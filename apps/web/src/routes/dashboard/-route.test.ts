// @vitest-environment happy-dom

import { isRedirect } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CaughtError } from "@/lib/errors";
import type { RouterAppContext } from "@/routes/__root";
import { loadDashboardSession, Route } from "@/routes/dashboard/route";
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

const runDashboardGuard = async () => await loadDashboardSession(getUser);

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

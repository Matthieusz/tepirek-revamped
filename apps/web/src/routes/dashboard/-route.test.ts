import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vite-plus/test";

import type { CaughtError } from "@/lib/errors";
import { loadDashboardSession } from "@/routes/dashboard/-load-dashboard-session";
import { Route } from "@/routes/dashboard/route";
import type { UserSession } from "@/types/route";

const makeSession = (verified: boolean) => ({
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

const runDashboardGuard = async (session: UserSession) =>
  await loadDashboardSession(async () => await Promise.resolve(session));

describe("dashboard authentication", () => {
  it("disables SSR for the authenticated route branch", () => {
    expect(Route.options.ssr).toBe(false);
  });

  it("redirects an unauthenticated visitor to login", async () => {
    const error = await runDashboardGuard(null).catch(
      (caughtError: CaughtError) => caughtError
    );

    expect(isRedirect(error)).toBe(true);
    expect(error).toMatchObject({ options: { to: "/login" } });
  });

  it("redirects an unverified member to the waiting room", async () => {
    const error = await runDashboardGuard(makeSession(false)).catch(
      (caughtError: CaughtError) => caughtError
    );

    expect(isRedirect(error)).toBe(true);
    expect(error).toMatchObject({ options: { to: "/waiting-room" } });
  });

  it("exposes a verified member session through route context", async () => {
    const session = makeSession(true);
    await expect(runDashboardGuard(session)).resolves.toEqual({ session });
  });
});

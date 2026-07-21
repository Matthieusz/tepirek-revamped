import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRouter } from "@/router";
import { Route as HeroesRoute } from "@/routes/dashboard/events/heroes";
import { Route as DashboardRoute } from "@/routes/dashboard/route";
import type { UserSession } from "@/types/route";

const { getUser, preloadAtomResults } = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<UserSession>>(),
  preloadAtomResults:
    vi.fn<(registry: unknown, atoms: readonly unknown[]) => Promise<void>>(),
}));

vi.mock("@/functions/get-user", () => ({ getUser }));
vi.mock("@/lib/atom-preload", () => ({ preloadAtomResults }));

const verifiedSession = {
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
    verified: true,
  },
} satisfies Exclude<UserSession, null>;

describe("direct heroes route loading", () => {
  beforeEach(() => {
    getUser.mockReset();
    preloadAtomResults.mockReset();
    preloadAtomResults.mockResolvedValue();
  });

  it("preloads route data after the dashboard guard verifies the session", async () => {
    getUser.mockResolvedValue(verifiedSession);
    const dashboardBeforeLoad = DashboardRoute.options.beforeLoad;
    const heroesLoader = HeroesRoute.options.loader;
    if (
      typeof dashboardBeforeLoad !== "function" ||
      typeof heroesLoader !== "function"
    ) {
      throw new TypeError("Dashboard guard and heroes loader must be defined");
    }

    const dashboardContext = await dashboardBeforeLoad({} as never);
    const router = getRouter();
    const context = { ...router.options.context, ...dashboardContext };

    await heroesLoader({ context } as never);

    expect(context.session).toBe(verifiedSession);
    expect(getUser).toHaveBeenCalledOnce();
    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(context.atomRegistry);
  });
});

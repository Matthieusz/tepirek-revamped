import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRouter } from "@/router";
import { Route as BetsAddRoute } from "@/routes/dashboard/events/bets.add";
import { Route as HeroesRoute } from "@/routes/dashboard/events/heroes";
import { Route as HistoryRoute } from "@/routes/dashboard/events/history";
import { Route as ListRoute } from "@/routes/dashboard/events/list";
import { Route as RankingRoute } from "@/routes/dashboard/events/ranking";
import { Route as VaultRoute } from "@/routes/dashboard/events/vault";
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

const runDashboardGuard = async () => {
  const dashboardBeforeLoad = DashboardRoute.options.beforeLoad;
  const router = getRouter();
  if (typeof dashboardBeforeLoad !== "function") {
    throw new TypeError("Dashboard guard must be defined");
  }

  const dashboardContext = await dashboardBeforeLoad({} as never);
  return { ...router.options.context, ...dashboardContext };
};

describe("events route loaders predeclare atoms on the request-scoped registry", () => {
  beforeEach(() => {
    getUser.mockReset();
    preloadAtomResults.mockReset();
    getUser.mockResolvedValue(verifiedSession);
    preloadAtomResults.mockResolvedValue();
  });

  it("preloads route data after the dashboard guard verifies the session for heroes", async () => {
    const context = await runDashboardGuard();
    const heroesLoader = HeroesRoute.options.loader;
    if (typeof heroesLoader !== "function") {
      throw new TypeError("Heroes loader must be defined");
    }

    await heroesLoader({ context } as never);

    expect(context.session).toBe(verifiedSession);
    expect(getUser).toHaveBeenCalledOnce();
    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(context.atomRegistry);
  });

  it("preloads the events atom for the list route", async () => {
    const context = await runDashboardGuard();
    const listLoader = ListRoute.options.loader;
    if (typeof listLoader !== "function") {
      throw new TypeError("List loader must be defined");
    }

    await listLoader({ context } as never);

    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(context.atomRegistry);
  });

  it("preloads the events, oldest-unpaid, and search-scoped vault atoms for the vault route", async () => {
    const context = await runDashboardGuard();
    const vaultLoader = VaultRoute.options.loader;
    if (typeof vaultLoader !== "function") {
      throw new TypeError("Vault loader must be defined");
    }

    await vaultLoader({ context, deps: { eventId: undefined } } as never);

    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(context.atomRegistry);
  });

  it("preloads only the events atom for the ranking route", async () => {
    const context = await runDashboardGuard();
    const rankingLoader = RankingRoute.options.loader;
    if (typeof rankingLoader !== "function") {
      throw new TypeError("Ranking loader must be defined");
    }

    await rankingLoader({ context } as never);

    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(context.atomRegistry);
  });

  it("preloads only the events atom for the history route", async () => {
    const context = await runDashboardGuard();
    const historyLoader = HistoryRoute.options.loader;
    if (typeof historyLoader !== "function") {
      throw new TypeError("History loader must be defined");
    }

    await historyLoader({ context } as never);

    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(context.atomRegistry);
  });

  it("preloads the events, heroes, and verified-users atoms for the bets/add route", async () => {
    const context = await runDashboardGuard();
    const betsAddLoader = BetsAddRoute.options.loader;
    if (typeof betsAddLoader !== "function") {
      throw new TypeError("Bets/add loader must be defined");
    }

    await betsAddLoader({ context } as never);

    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(context.atomRegistry);
  });
});

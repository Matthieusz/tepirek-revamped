// @vitest-environment happy-dom

import { createMemoryHistory } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRouter } from "@/router";
import type { RouterAppContext } from "@/routes/__root";
import { Route as HistoryRoute } from "@/routes/dashboard/events/history";
import { Route as RankingRoute } from "@/routes/dashboard/events/ranking";
import { Route as VaultRoute } from "@/routes/dashboard/events/vault";
import type { AuthSession } from "@/types/route";

const getUser = vi.fn<RouterAppContext["getUser"]>();
const preloadAtomResults = vi.fn<RouterAppContext["preloadAtomResults"]>();

const verifiedSession: AuthSession = {
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
};

type EventRoutePath =
  | "/dashboard/events/bets/add"
  | "/dashboard/events/heroes"
  | "/dashboard/events/history"
  | "/dashboard/events/list"
  | "/dashboard/events/ranking"
  | "/dashboard/events/vault";

const loadEventRoute = async (to: EventRoutePath) => {
  const router = getRouter();
  router.update({
    context: { ...router.options.context, getUser, preloadAtomResults },
    history: createMemoryHistory({ initialEntries: ["/"] }),
    isServer: false,
  });
  await router.preloadRoute({ to });
  return router;
};

describe("events route loaders predeclare atoms on the request-scoped registry", () => {
  beforeEach(() => {
    getUser.mockReset();
    preloadAtomResults.mockReset();
    getUser.mockResolvedValue(verifiedSession);
    preloadAtomResults.mockResolvedValue();
  });

  it("preloads route data after the dashboard guard verifies the session for heroes", async () => {
    const router = await loadEventRoute("/dashboard/events/heroes");

    expect(getUser).toHaveBeenCalledOnce();
    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(
      router.options.context.atomRegistry
    );
  });

  it("preloads the events atom for the list route", async () => {
    const router = await loadEventRoute("/dashboard/events/list");

    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(
      router.options.context.atomRegistry
    );
  });

  it("preloads stable route data for the vault route", async () => {
    const router = await loadEventRoute("/dashboard/events/vault");

    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(
      router.options.context.atomRegistry
    );
  });

  it("keeps filter changes out of the event data route loaders", () => {
    expect(HistoryRoute.options.loaderDeps).toBeUndefined();
    expect(RankingRoute.options.loaderDeps).toBeUndefined();
    expect(VaultRoute.options.loaderDeps).toBeUndefined();
  });

  it("preloads only the events atom for the ranking route", async () => {
    const router = await loadEventRoute("/dashboard/events/ranking");

    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(
      router.options.context.atomRegistry
    );
  });

  it("preloads only the events atom for the history route", async () => {
    const router = await loadEventRoute("/dashboard/events/history");

    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(
      router.options.context.atomRegistry
    );
  });

  it("preloads the events, heroes, and verified-users atoms for the bets/add route", async () => {
    const router = await loadEventRoute("/dashboard/events/bets/add");

    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(
      router.options.context.atomRegistry
    );
  });
});

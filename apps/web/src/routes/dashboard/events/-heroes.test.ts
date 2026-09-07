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
  const query = vi
    .spyOn(router.options.context.queryClient, "query")
    .mockResolvedValue([]);
  router.update({
    context: { ...router.options.context, getUser, preloadAtomResults },
    history: createMemoryHistory({ initialEntries: ["/"] }),
    isServer: false,
  });
  query.mockClear();
  await router.preloadRoute({ to });
  return { query, router };
};

describe("event route loaders preload their data", () => {
  beforeEach(() => {
    getUser.mockReset();
    preloadAtomResults.mockReset();
    getUser.mockResolvedValue(verifiedSession);
    preloadAtomResults.mockResolvedValue();
  });

  it("preloads events and heroes for the heroes route", async () => {
    const { query } = await loadEventRoute("/dashboard/events/heroes");

    expect(getUser).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("preloads events for the list route", async () => {
    const { query } = await loadEventRoute("/dashboard/events/list");

    expect(query).toHaveBeenCalledOnce();
  });

  it("preloads events and the atom-owned vault data", async () => {
    const { query } = await loadEventRoute("/dashboard/events/vault");

    expect(query).toHaveBeenCalledOnce();
    expect(preloadAtomResults).toHaveBeenCalledOnce();
  });

  it("keeps filter changes out of the event data route loaders", () => {
    expect(HistoryRoute.options.loaderDeps).toBeUndefined();
    expect(RankingRoute.options.loaderDeps).toBeUndefined();
    expect(VaultRoute.options.loaderDeps).toBeUndefined();
  });

  it("preloads events for the ranking route", async () => {
    const { query } = await loadEventRoute("/dashboard/events/ranking");

    expect(query).toHaveBeenCalledOnce();
  });

  it("preloads events for the history route", async () => {
    const { query } = await loadEventRoute("/dashboard/events/history");

    expect(query).toHaveBeenCalledOnce();
  });

  it("preloads events, heroes, and verified users for the bets/add route", async () => {
    const { query } = await loadEventRoute("/dashboard/events/bets/add");

    expect(query).toHaveBeenCalledTimes(3);
  });
});

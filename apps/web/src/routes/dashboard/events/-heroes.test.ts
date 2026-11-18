import { createMemoryHistory } from "@tanstack/react-router";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { getRouter } from "@/router";
import { Route as HistoryRoute } from "@/routes/dashboard/events/history";
import { Route as RankingRoute } from "@/routes/dashboard/events/ranking";
import { Route as VaultRoute } from "@/routes/dashboard/events/vault";
import type { AuthSession } from "@/types/route";

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
});

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

  const requests: string[] = [];
  const endpoints = [
    ["/events", []],
    ["/heroes", []],
    ["/ranking/oldest-unpaid-event", null],
    ["/user/verified", []],
  ] as const;
  server.use(
    ...endpoints.map(([path, body]) =>
      http.get(`http://localhost:3000${path}`, ({ request }) => {
        requests.push(new URL(request.url).pathname);

        return HttpResponse.json(body);
      })
    )
  );

  router.update({
    context: {
      ...router.options.context,
      getUser: async () => await Promise.resolve(verifiedSession),
    },
    history: createMemoryHistory({ initialEntries: ["/"] }),
    isServer: false,
  });

  try {
    await router.preloadRoute({ to });
    return requests.toSorted();
  } finally {
    router.options.context.queryClient.clear();
    server.resetHandlers();
  }
};

describe("event route loaders preload their data", () => {
  it("preloads events and heroes for the heroes route", async () => {
    expect(await loadEventRoute("/dashboard/events/heroes")).toEqual([
      "/events",
      "/heroes",
    ]);
  });

  it("preloads events for the list route", async () => {
    expect(await loadEventRoute("/dashboard/events/list")).toEqual(["/events"]);
  });

  it("preloads events and oldest-unpaid data for the vault route", async () => {
    expect(await loadEventRoute("/dashboard/events/vault")).toEqual([
      "/events",
      "/ranking/oldest-unpaid-event",
    ]);
  });

  it("keeps filter changes out of the event data route loaders", () => {
    expect(HistoryRoute.options.loaderDeps).toBeUndefined();
    expect(RankingRoute.options.loaderDeps).toBeUndefined();
    expect(VaultRoute.options.loaderDeps).toBeUndefined();
  });

  it("preloads events for the ranking route", async () => {
    expect(await loadEventRoute("/dashboard/events/ranking")).toEqual([
      "/events",
    ]);
  });

  it("preloads events for the history route", async () => {
    expect(await loadEventRoute("/dashboard/events/history")).toEqual([
      "/events",
    ]);
  });

  it("preloads events, heroes, and verified users for the bets/add route", async () => {
    expect(await loadEventRoute("/dashboard/events/bets/add")).toEqual([
      "/events",
      "/heroes",
      "/user/verified",
    ]);
  });
});

import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRouter } from "@/router";
import type { UserSession } from "@/types/route";

const { getUser, preloadAtomResults } = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<UserSession>>(),
  preloadAtomResults:
    vi.fn<(registry: unknown, atoms: readonly unknown[]) => Promise<void>>(),
}));

vi.mock("@/functions/get-user", () => ({ getUser }));
vi.mock("@/lib/atom-preload", () => ({ preloadAtomResults }));
vi.mock("@/routes/dashboard/events/-components/heroes-page", () => ({
  default: () => createElement("h1", null, "Lazy heroes page"),
}));

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

  it("inherits the verified session from the dashboard route", async () => {
    getUser.mockResolvedValue(verifiedSession);
    const router = getRouter();
    router.update({
      context: router.options.context,
      history: createMemoryHistory({
        initialEntries: ["/dashboard/events/heroes"],
      }),
    });

    await router.load();

    const heroesMatch = router.state.matches.find(
      (match) => match.routeId === "/dashboard/events/heroes"
    );
    expect(heroesMatch?.context).toMatchObject({ session: verifiedSession });
    expect(
      renderToStaticMarkup(createElement(RouterProvider, { router }))
    ).toContain("Lazy heroes page");
    expect(getUser).toHaveBeenCalledOnce();
    expect(preloadAtomResults).toHaveBeenCalledOnce();
    expect(preloadAtomResults.mock.calls[0]?.[0]).toBe(
      router.options.context.atomRegistry
    );
  });
});

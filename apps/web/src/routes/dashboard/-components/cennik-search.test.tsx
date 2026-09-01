// @vitest-environment happy-dom

import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useSearch,
} from "@tanstack/react-router";
import { LegendPriceSummary } from "@tepirek-revamped/api/protocol/legend-pricing/http-api-contract";
import * as Schema from "effect/Schema";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LegendPrice } from "@/features/legend-pricing/legend-pricing-atoms";
import { CennikContent } from "@/routes/dashboard/-components/cennik-page";

const makeLegendPrice = (index: number): LegendPrice =>
  Schema.decodeSync(LegendPriceSummary)({
    enemies: [
      {
        category: "hero",
        iconUrl: `https://micc.garmory-cdn.cloud/obrazki/npc/test/${index}.gif`,
        id: index,
        level: index,
        name: `Potwór ${index}`,
        sourceIconKey: `/obrazki/npc/test/${index}.gif`,
      },
    ],
    equipmentType: "weapon",
    iconUrl: `https://micc.garmory-cdn.cloud/obrazki/itemy/test/${index}.gif`,
    itemId: index,
    lastSyncedAt: "2026-08-18T12:00:00.000Z",
    legendaryBonus: null,
    level: index,
    name: `Przedmiot ${index}`,
    priceGold: null,
    priceUpdatedAt: null,
    professions: [],
    sourceIconKey: `/obrazki/itemy/test/${index}.gif`,
    version: 0,
  });

const cennikSearchSchema = Schema.Struct({
  itemLevel: Schema.optional(Schema.String),
  itemName: Schema.optional(Schema.String),
  monsterName: Schema.optional(Schema.String),
  monsterType: Schema.optional(Schema.Literals(["hero", "elite2"])),
});
const rootRoute = createRootRoute();
const CennikTestRoute = () => {
  const search = useSearch({ from: "/dashboard/cennik" });
  return (
    <CennikContent
      isAdmin={false}
      prices={[makeLegendPrice(1)]}
      search={search}
    />
  );
};
const cennikRoute = createRoute({
  component: CennikTestRoute,
  getParentRoute: () => rootRoute,
  path: "/dashboard/cennik",
  validateSearch: Schema.decodeUnknownSync(cennikSearchSchema),
});
const cennikRouteTree = rootRoute.addChildren([cennikRoute]);

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

const renderCennik = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const reactRoot = createRoot(container);
  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: ["/dashboard/cennik"],
    }),
    routeTree: cennikRouteTree,
  });

  await router.load();
  act(() => {
    reactRoot.render(<RouterProvider router={router} />);
  });

  return { reactRoot, router };
};

describe("Cennik search", () => {
  it("keeps typing local before synchronizing the URL", async () => {
    vi.useFakeTimers();
    const { reactRoot, router } = await renderCennik();
    const input = document.querySelector<HTMLInputElement>("#legend-item-name");
    if (input === null) {
      throw new Error("The item search input was not rendered");
    }
    expect(
      document.querySelectorAll(
        "#legend-item-name, #legend-monster-name, #legend-item-level"
      )
    ).toHaveLength(3);

    act(() => {
      input.focus();
      const setInputValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      setInputValue?.call(input, "miecz");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(input.value).toBe("miecz");
    expect(router.state.location.search).toEqual({});

    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(router.state.location.search).toEqual({ itemName: "miecz" });
    expect(
      document.querySelectorAll(
        "#legend-item-name, #legend-monster-name, #legend-item-level"
      )
    ).toHaveLength(3);
    expect(document.activeElement).toBe(input);
    reactRoot.unmount();
  });
});

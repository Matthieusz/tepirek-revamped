import { LegendPriceSummary } from "@tepirek-revamped/api/protocol/legend-pricing/http-api-contract";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import type { LegendPrice } from "@/features/legend-pricing/legend-pricing-atoms";
import { groupLegendPricesByEnemy } from "@/routes/dashboard/-components/cennik-groups";

interface EnemyFixture {
  readonly category: "elite2" | "hero";
  readonly id: number;
  readonly level: number;
  readonly name: string;
}

const makeLegendPrice = ({
  enemies,
  itemId,
  level,
  name,
}: {
  readonly enemies: readonly EnemyFixture[];
  readonly itemId: number;
  readonly level: number;
  readonly name: string;
}): LegendPrice =>
  Schema.decodeSync(LegendPriceSummary)({
    enemies: enemies.map((enemy) => ({
      ...enemy,
      iconUrl: `https://micc.garmory-cdn.cloud/obrazki/npc/test/${enemy.id}.gif`,
      sourceIconKey: `/obrazki/npc/test/${enemy.id}.gif`,
    })),
    equipmentType: "weapon",
    iconUrl: `https://micc.garmory-cdn.cloud/obrazki/itemy/test/${itemId}.gif`,
    itemId,
    lastSyncedAt: "2026-08-18T12:00:00.000Z",
    legendaryBonus: null,
    level,
    name,
    priceGold: null,
    priceUpdatedAt: null,
    professions: [],
    sourceIconKey: `/obrazki/itemy/test/${itemId}.gif`,
    version: 0,
  });

const goplana = {
  category: "hero",
  id: 1,
  level: 120,
  name: "Goplana",
} as const;
const morthen = {
  category: "elite2",
  id: 2,
  level: 110,
  name: "Morthen",
} as const;

const prices = [
  makeLegendPrice({
    enemies: [goplana, morthen],
    itemId: 1,
    level: 50,
    name: "Pierścień Burzy",
  }),
  makeLegendPrice({
    enemies: [goplana],
    itemId: 2,
    level: 60,
    name: "Miecz Goplany",
  }),
];

describe("legend price grouping", () => {
  it("shows a shared item in every monster group ordered by monster level", () => {
    const groups = groupLegendPricesByEnemy(prices, {});

    expect(
      groups.map((group) => ({
        items: group.items.map((item) => item.name),
        level: group.enemy.level,
        monster: group.enemy.name,
      }))
    ).toEqual([
      {
        items: ["Pierścień Burzy"],
        level: 110,
        monster: "Morthen",
      },
      {
        items: ["Pierścień Burzy", "Miecz Goplany"],
        level: 120,
        monster: "Goplana",
      },
    ]);
  });

  it("filters independently by item name, monster name, and exact item level", () => {
    const groups = groupLegendPricesByEnemy(prices, {
      itemLevel: "60",
      itemName: "miecz",
      monsterName: "gop",
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]?.enemy.name).toBe("Goplana");
    expect(groups[0]?.items.map((item) => item.name)).toEqual([
      "Miecz Goplany",
    ]);
  });

  it("filters monsters by type", () => {
    const groups = groupLegendPricesByEnemy(prices, {
      monsterType: "elite2",
    });

    expect(groups.map((group) => group.enemy.name)).toEqual(["Morthen"]);
  });
});

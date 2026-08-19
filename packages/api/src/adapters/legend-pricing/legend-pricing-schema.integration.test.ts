import {
  legendaryEnemy,
  legendaryItem,
  legendaryItemCost,
  legendaryItemDrop,
} from "@tepirek-revamped/db/schema/legend-pricing";
import { expect, it } from "vitest";

import { createVerifiedMember } from "../../test/integration/builders.ts";
import { testDb } from "../../test/integration/database.ts";

const synchronizedAt = new Date("2026-08-18T20:00:00.000Z");

const createCatalogRows = async () => {
  const [enemy] = await testDb
    .insert(legendaryEnemy)
    .values({
      category: "hero",
      iconUrl: "https://micc.garmory-cdn.cloud/obrazki/npc/her/enemy.gif",
      lastSeenAt: synchronizedAt,
      level: 21,
      name: "Domina Ecclesiae",
      profession: "warrior",
      sourceFingerprint: '["Domina Ecclesiae",21]',
      sourceIconKey: "/obrazki/npc/her/enemy.gif",
      sourcePostId: 81_268,
      sourceUrl: "https://forum.margonem.pl/?id=514740&ps=0",
    })
    .returning();
  const [item] = await testDb
    .insert(legendaryItem)
    .values({
      equipmentType: "ring",
      iconUrl:
        "https://micc.garmory-cdn.cloud/obrazki/itemy/pie/pierscien1411.gif",
      lastSeenAt: synchronizedAt,
      legendaryBonus: "lastheal,279",
      level: 279,
      name: "Dusza wodnego smoka",
      professions: ["mage", "paladin"],
      sourceFingerprint: '["Dusza wodnego smoka",279,"ring"]',
      sourceIconKey: "/obrazki/itemy/pie/pierscien1411.gif",
    })
    .returning();

  if (!(enemy && item)) {
    throw new Error("Failed to create legend-pricing integration fixtures");
  }

  return { enemy, item };
};

it("enforces unique source identities, drops, and one cost per item", async () => {
  const actor = await createVerifiedMember({ id: "legend-pricing-actor" });
  const { enemy, item } = await createCatalogRows();

  await testDb.insert(legendaryItemDrop).values({
    enemyId: enemy.id,
    itemId: item.id,
  });
  await testDb.insert(legendaryItemCost).values({
    itemId: item.id,
    priceGold: 0,
    updatedBy: actor.id,
  });

  await expect(
    testDb.insert(legendaryEnemy).values({
      category: "hero",
      iconUrl: enemy.iconUrl,
      lastSeenAt: synchronizedAt,
      level: 21,
      name: "Duplicate enemy",
      profession: "warrior",
      sourceFingerprint: "duplicate",
      sourceIconKey: enemy.sourceIconKey,
      sourcePostId: 81_269,
      sourceUrl: "https://forum.margonem.pl/?id=514740&ps=0",
    })
  ).rejects.toThrow();
  await expect(
    testDb.insert(legendaryItem).values({
      equipmentType: "helmet",
      iconUrl: "https://micc.garmory-cdn.cloud/obrazki/itemy/hel/duplicate.gif",
      lastSeenAt: synchronizedAt,
      legendaryBonus: "duplicate",
      level: 30,
      name: "Duplicate item",
      professions: [],
      sourceFingerprint: "duplicate",
      sourceIconKey: item.sourceIconKey,
    })
  ).rejects.toThrow();
  await expect(
    testDb.insert(legendaryItemDrop).values({
      enemyId: enemy.id,
      itemId: item.id,
    })
  ).rejects.toThrow();
  await expect(
    testDb.insert(legendaryItemCost).values({
      itemId: item.id,
      priceGold: 1,
      updatedBy: actor.id,
    })
  ).rejects.toThrow();
});

it("rejects negative prices and non-positive versions", async () => {
  const actor = await createVerifiedMember({
    id: "legend-pricing-invalid-cost-actor",
  });
  const { item } = await createCatalogRows();

  await expect(
    testDb.insert(legendaryItemCost).values({
      itemId: item.id,
      priceGold: -1,
      updatedBy: actor.id,
    })
  ).rejects.toThrow();
  await expect(
    testDb.insert(legendaryItemCost).values({
      itemId: item.id,
      priceGold: 1,
      updatedBy: actor.id,
      version: 0,
    })
  ).rejects.toThrow();
});

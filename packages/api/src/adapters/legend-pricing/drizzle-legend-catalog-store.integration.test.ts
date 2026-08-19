import { expect, it as effectIt } from "@effect/vitest";
import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import {
  legendaryEnemy,
  legendaryItem,
  legendaryItemCost,
  legendaryItemDrop,
} from "@tepirek-revamped/db/schema/legend-pricing";
import { asc, eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  LegendaryBonus,
  LegendaryEnemyLevel,
  LegendaryItemLevel,
  MargonemCdnIconUrl,
  LegendaryEnemySourceKey,
  LegendaryItemSourceKey,
  MargonemForumPostId,
} from "../../domain/legend-pricing/legend-catalog.ts";
import type { ReconcileLegendCatalogInput } from "../../services/legend-pricing/legend-catalog-store.ts";
import { LegendCatalogStoreService } from "../../services/legend-pricing/legend-catalog-store.ts";
import { createVerifiedMember } from "../../test/integration/builders.ts";
import {
  defaultTestDatabaseUrl,
  testDb,
} from "../../test/integration/database.ts";
import { DrizzleLegendCatalogStoreServiceLayer } from "./drizzle-legend-catalog-store.ts";

const firstSynchronizedAt = new Date("2026-08-19T10:00:00.000Z");
const secondSynchronizedAt = new Date("2026-08-26T10:00:00.000Z");
const startedAt = new Date("2026-08-19T09:59:00.000Z");
const enemyKey = (value: string) => LegendaryEnemySourceKey.make(value);
const itemKey = (value: string) => LegendaryItemSourceKey.make(value);
const icon = (value: string) => MargonemCdnIconUrl.make(value);
const postId = (value: number) => MargonemForumPostId.make(value);
const enemyLevel = (value: number) => LegendaryEnemyLevel.make(value);
const itemLevel = (value: number) => LegendaryItemLevel.make(value);

const makeInitialSnapshot = (): ReconcileLegendCatalogInput => ({
  drops: [
    {
      enemyCategory: "hero",
      enemySourceIconKey: enemyKey("/obrazki/npc/her/hero.gif"),
      itemSourceIconKey: itemKey("/obrazki/itemy/pie/shared.gif"),
    },
    {
      enemyCategory: "elite2",
      enemySourceIconKey: enemyKey("/obrazki/npc/e2/elite.gif"),
      itemSourceIconKey: itemKey("/obrazki/itemy/pie/shared.gif"),
    },
    {
      enemyCategory: "hero",
      enemySourceIconKey: enemyKey("/obrazki/npc/her/hero.gif"),
      itemSourceIconKey: itemKey("/obrazki/itemy/hel/helmet.gif"),
    },
  ],
  enemies: [
    {
      category: "hero",
      iconUrl: icon("https://micc.garmory-cdn.cloud/obrazki/npc/her/hero.gif"),
      level: enemyLevel(21),
      name: "Current Hero",
      profession: "warrior",
      sourceIconKey: enemyKey("/obrazki/npc/her/hero.gif"),
      sourcePostId: postId(101),
      sourceUrl: "https://forum.margonem.pl/?id=514740&ps=0",
    },
    {
      category: "elite2",
      iconUrl: icon("https://micc.garmory-cdn.cloud/obrazki/npc/e2/elite.gif"),
      level: enemyLevel(30),
      name: "Current Elite II",
      profession: "mage",
      sourceIconKey: enemyKey("/obrazki/npc/e2/elite.gif"),
      sourcePostId: postId(102),
      sourceUrl: "https://forum.margonem.pl/?id=514805&ps=0",
    },
  ],
  items: [
    {
      equipmentType: "ring",
      iconUrl: icon(
        "https://micc.garmory-cdn.cloud/obrazki/itemy/pie/shared.gif"
      ),
      legendaryBonus: LegendaryBonus.make("lastheal,100"),
      level: itemLevel(100),
      name: "Shared Ring",
      professions: ["mage", "paladin"],
      sourceIconKey: itemKey("/obrazki/itemy/pie/shared.gif"),
    },
    {
      equipmentType: "helmet",
      iconUrl: icon(
        "https://micc.garmory-cdn.cloud/obrazki/itemy/hel/helmet.gif"
      ),
      legendaryBonus: LegendaryBonus.make("verycrit,10"),
      level: itemLevel(90),
      name: "Old Helmet",
      professions: ["warrior"],
      sourceIconKey: itemKey("/obrazki/itemy/hel/helmet.gif"),
    },
  ],
  sourcePosts: [
    { category: "hero", editedAt: null, postId: postId(101) },
    { category: "elite2", editedAt: null, postId: postId(102) },
  ],
  startedAt,
  synchronizedAt: firstSynchronizedAt,
});

const makeReducedSnapshot = (): ReconcileLegendCatalogInput => {
  const initial = makeInitialSnapshot();
  const [originalHero, elite] = initial.enemies;
  const [sharedItem] = initial.items;
  const [, eliteDrop] = initial.drops;
  const [heroPost, elitePost] = initial.sourcePosts;
  if (
    originalHero === undefined ||
    elite === undefined ||
    sharedItem === undefined ||
    eliteDrop === undefined ||
    heroPost === undefined ||
    elitePost === undefined
  ) {
    throw new Error("Initial catalog fixture is incomplete");
  }
  const replacementHero = {
    ...originalHero,
    iconUrl: icon(
      "https://micc.garmory-cdn.cloud/obrazki/npc/her/replacement.gif"
    ),
    name: "Replacement Hero",
    sourceIconKey: enemyKey("/obrazki/npc/her/replacement.gif"),
    sourcePostId: postId(103),
  };
  return {
    ...initial,
    drops: [
      eliteDrop,
      {
        enemyCategory: "hero",
        enemySourceIconKey: replacementHero.sourceIconKey,
        itemSourceIconKey: sharedItem.sourceIconKey,
      },
    ],
    enemies: [replacementHero, elite],
    items: [sharedItem],
    sourcePosts: [heroPost, elitePost],
    synchronizedAt: secondSynchronizedAt,
  };
};

const integrationLayer = DrizzleLegendCatalogStoreServiceLayer.pipe(
  Layer.provide(makeLiveDatabaseLayer(defaultTestDatabaseUrl))
);

effectIt.layer(integrationLayer, { excludeTestServices: true })(
  "Drizzle legend catalog store",
  (it) => {
    it.effect("reconciles idempotently and preserves administrator costs", () =>
      Effect.gen(function* reconcileCatalog() {
        const store = yield* LegendCatalogStoreService;
        const initialResult = yield* store.reconcile(makeInitialSnapshot());
        expect(initialResult).toEqual({
          activatedEnemyCount: 2,
          activatedItemCount: 2,
          deactivatedEnemyCount: 0,
          deactivatedItemCount: 0,
        });

        const actor = yield* Effect.promise(() =>
          createVerifiedMember({ id: "legend-catalog-price-admin" })
        );
        const [pricedItem] = yield* Effect.promise(() =>
          testDb
            .select({ id: legendaryItem.id })
            .from(legendaryItem)
            .where(
              eq(legendaryItem.sourceIconKey, "/obrazki/itemy/pie/shared.gif")
            )
        );
        if (pricedItem === undefined) {
          throw new Error("Failed to load the item selected for pricing");
        }
        yield* Effect.promise(() =>
          testDb.insert(legendaryItemCost).values({
            itemId: pricedItem.id,
            priceGold: 123_456,
            updatedBy: actor.id,
            version: 4,
          })
        );

        const reducedResult = yield* store.reconcile(makeReducedSnapshot());
        const repeatedResult = yield* store.reconcile(makeReducedSnapshot());
        expect(reducedResult).toEqual({
          activatedEnemyCount: 1,
          activatedItemCount: 0,
          deactivatedEnemyCount: 1,
          deactivatedItemCount: 1,
        });
        expect(repeatedResult).toEqual({
          activatedEnemyCount: 0,
          activatedItemCount: 0,
          deactivatedEnemyCount: 0,
          deactivatedItemCount: 0,
        });

        const enemies = yield* Effect.promise(() =>
          testDb
            .select({
              active: legendaryEnemy.active,
              name: legendaryEnemy.name,
            })
            .from(legendaryEnemy)
            .orderBy(asc(legendaryEnemy.id))
        );
        const items = yield* Effect.promise(() =>
          testDb
            .select({ active: legendaryItem.active, name: legendaryItem.name })
            .from(legendaryItem)
            .orderBy(asc(legendaryItem.id))
        );
        const costs = yield* Effect.promise(() =>
          testDb.select().from(legendaryItemCost)
        );
        const drops = yield* Effect.promise(() =>
          testDb.select().from(legendaryItemDrop)
        );

        expect(enemies).toEqual([
          { active: false, name: "Current Hero" },
          { active: true, name: "Current Elite II" },
          { active: true, name: "Replacement Hero" },
        ]);
        expect(items).toEqual([
          { active: true, name: "Shared Ring" },
          { active: false, name: "Old Helmet" },
        ]);
        expect(costs).toMatchObject([
          { itemId: pricedItem.id, priceGold: 123_456, version: 4 },
        ]);
        expect(drops).toHaveLength(2);
      })
    );
  }
);

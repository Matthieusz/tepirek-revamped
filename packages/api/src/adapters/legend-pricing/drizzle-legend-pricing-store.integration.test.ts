import { expect, it as effectIt } from "@effect/vitest";
import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import {
  legendaryEnemy,
  legendaryItem,
  legendaryItemDrop,
} from "@tepirek-revamped/db/schema/legend-pricing";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  LegendaryEnemyId,
  LegendaryItemId,
  LegendCostVersion,
  LegendPriceGold,
} from "../../domain/legend-pricing/legend-catalog.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import { ApplicationConflict } from "../../services/application-errors.ts";
import { LegendPricingStore } from "../../services/legend-pricing/legend-pricing-store.ts";
import { createVerifiedMember } from "../../test/integration/builders.ts";
import {
  defaultTestDatabaseUrl,
  testDb,
} from "../../test/integration/database.ts";
import { DrizzleLegendPricingStoreLayer } from "./drizzle-legend-pricing-store.ts";

const integrationLayer = DrizzleLegendPricingStoreLayer.pipe(
  Layer.provide(makeLiveDatabaseLayer(defaultTestDatabaseUrl))
);

effectIt.layer(integrationLayer, { excludeTestServices: true })(
  "Drizzle legend pricing store",
  (it) => {
    it.effect(
      "lists active drops and protects price updates with versions",
      () =>
        Effect.gen(function* verifyLegendPricingStore() {
          const store = yield* LegendPricingStore;
          const actor = yield* Effect.promise(() =>
            createVerifiedMember({ id: "legend-pricing-store-admin" })
          );
          const [enemy] = yield* Effect.promise(() =>
            testDb
              .insert(legendaryEnemy)
              .values({
                category: "hero",
                iconUrl:
                  "https://micc.garmory-cdn.cloud/obrazki/npc/her/store.gif",
                lastSeenAt: new Date("2026-08-18T20:00:00.000Z"),
                level: 21,
                name: "Store Hero",
                profession: "warrior",
                sourceFingerprint: '["Store Hero",21]',
                sourceIconKey: "/obrazki/npc/her/store.gif",
                sourcePostId: 81_268,
                sourceUrl: "https://forum.margonem.pl/?id=514740&ps=0",
              })
              .returning()
          );
          const [item] = yield* Effect.promise(() =>
            testDb
              .insert(legendaryItem)
              .values({
                equipmentType: "ring",
                iconUrl:
                  "https://micc.garmory-cdn.cloud/obrazki/itemy/pie/store.gif",
                lastSeenAt: new Date("2026-08-18T20:00:00.000Z"),
                level: 100,
                name: "Store Ring",
                professions: ["warrior"],
                sourceFingerprint: '["Store Ring",100,"ring"]',
                sourceIconKey: "/obrazki/itemy/pie/store.gif",
              })
              .returning()
          );
          if (enemy === undefined || item === undefined) {
            throw new Error("Failed to create legend pricing store fixtures");
          }
          yield* Effect.promise(() =>
            testDb.insert(legendaryItemDrop).values({
              enemyId: enemy.id,
              itemId: item.id,
            })
          );

          const [unpriced] = yield* store.list();
          expect(unpriced).toMatchObject({
            itemId: LegendaryItemId.make(item.id),
            name: "Store Ring",
            priceGold: null,
            version: LegendCostVersion.make(0),
          });

          const priced = yield* store.updateCost({
            expectedVersion: LegendCostVersion.make(0),
            itemId: LegendaryItemId.make(item.id),
            priceGold: LegendPriceGold.make(123_456),
            updatedBy: AppUserId.make(actor.id),
          });
          expect(priced).toMatchObject({
            priceGold: 123_456,
            version: 1,
          });

          const conflict = yield* store
            .updateCost({
              expectedVersion: LegendCostVersion.make(0),
              itemId: LegendaryItemId.make(item.id),
              priceGold: LegendPriceGold.make(999),
              updatedBy: AppUserId.make(actor.id),
            })
            .pipe(Effect.flip);
          expect(conflict).toBeInstanceOf(ApplicationConflict);

          const repriced = yield* store.updateCost({
            expectedVersion: LegendCostVersion.make(1),
            itemId: LegendaryItemId.make(item.id),
            priceGold: LegendPriceGold.make(654_321),
            updatedBy: AppUserId.make(actor.id),
          });
          expect(repriced).toMatchObject({
            priceGold: 654_321,
            version: 2,
          });

          expect(repriced.enemies).toMatchObject([
            {
              category: "hero",
              id: LegendaryEnemyId.make(enemy.id),
              level: 21,
              name: "Store Hero",
              sourceIconKey: "/obrazki/npc/her/store.gif",
            },
          ]);
          expect(repriced).toMatchObject({
            equipmentType: "ring",
            itemId: LegendaryItemId.make(item.id),
            lastSyncedAt: expect.any(Date),
            level: 100,
            professions: ["warrior"],
            sourceIconKey: "/obrazki/itemy/pie/store.gif",
          });
          expect(repriced.priceUpdatedAt).toBeInstanceOf(Date);
        })
    );
  }
);

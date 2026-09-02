/* eslint-disable no-shadow -- Named generators mirror persistence operation names for traces. */
import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import {
  legendaryEnemy,
  legendaryItem,
  legendaryItemCost,
  legendaryItemDrop,
} from "@tepirek-revamped/db/schema/legend-pricing";
import { and, asc, eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";

import {
  LegendaryEnemyId,
  LegendaryEnemyLevel,
  LegendaryEnemySourceKey,
  LegendaryItemId,
  LegendaryItemLevel,
  LegendaryItemSourceKey,
  LegendCostVersion,
  LegendPriceGold,
  MargonemCdnIconUrl,
  LegendaryBonus,
} from "../../domain/legend-pricing/legend-catalog.ts";
import {
  ApplicationConflict,
  ApplicationDependencyUnavailable,
  ApplicationNotFound,
} from "../../services/application-errors.ts";
import { LegendPricingStore } from "../../services/legend-pricing/legend-pricing-store.ts";
import type {
  LegendPriceEnemySource,
  LegendPriceSummary,
  UpdateLegendCostInput,
} from "../../services/legend-pricing/legend-pricing-store.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "../persistence-query.ts";

const listOperation = "listLegendPrices" as const;
const updateOperation = "updateLegendCost" as const;

const persistenceQuery = makeDirectPersistenceQuery(
  (input) => new ApplicationDependencyUnavailable(input)
);

const decodePersisted = <A>(
  schema: Schema.ConstraintDecoder<A>,
  operation: string
) =>
  decodePersistedValue(
    schema,
    operation,
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Persistence decoders use the shared Effect adapter callback.
    (error) => new ApplicationDependencyUnavailable(error)
  );

interface PriceRow {
  readonly item: {
    readonly equipmentType: LegendPriceSummary["equipmentType"];
    readonly iconUrl: string;
    readonly id: number;
    readonly lastSeenAt: Date;
    readonly legendaryBonus: string | null;
    readonly level: number;
    readonly name: string;
    readonly professions: readonly LegendPriceSummary["professions"][number][];
    readonly sourceIconKey: string;
  };
  readonly enemy: {
    readonly category: LegendPriceEnemySource["category"];
    readonly iconUrl: string;
    readonly id: number;
    readonly level: number;
    readonly name: string;
    readonly sourceIconKey: string;
  };
  readonly cost: {
    readonly priceGold: number;
    readonly updatedAt: Date;
    readonly version: number;
  } | null;
}

const selectPriceRows = (
  database: EffectPgDatabase | TransactionDatabase,
  itemId?: number
) =>
  database
    .select({
      cost: {
        priceGold: legendaryItemCost.priceGold,
        updatedAt: legendaryItemCost.updatedAt,
        version: legendaryItemCost.version,
      },
      enemy: {
        category: legendaryEnemy.category,
        iconUrl: legendaryEnemy.iconUrl,
        id: legendaryEnemy.id,
        level: legendaryEnemy.level,
        name: legendaryEnemy.name,
        sourceIconKey: legendaryEnemy.sourceIconKey,
      },
      item: {
        equipmentType: legendaryItem.equipmentType,
        iconUrl: legendaryItem.iconUrl,
        id: legendaryItem.id,
        lastSeenAt: legendaryItem.lastSeenAt,
        legendaryBonus: legendaryItem.legendaryBonus,
        level: legendaryItem.level,
        name: legendaryItem.name,
        professions: legendaryItem.professions,
        sourceIconKey: legendaryItem.sourceIconKey,
      },
    })
    .from(legendaryItem)
    .innerJoin(
      legendaryItemDrop,
      eq(legendaryItemDrop.itemId, legendaryItem.id)
    )
    .innerJoin(
      legendaryEnemy,
      and(
        eq(legendaryItemDrop.enemyId, legendaryEnemy.id),
        eq(legendaryEnemy.active, true)
      )
    )
    .leftJoin(legendaryItemCost, eq(legendaryItemCost.itemId, legendaryItem.id))
    .where(
      and(
        eq(legendaryItem.active, true),
        itemId === undefined ? sql`true` : eq(legendaryItem.id, itemId)
      )
    )
    .orderBy(
      asc(legendaryItem.name),
      asc(legendaryEnemy.category),
      asc(legendaryEnemy.name)
    );

const decodePriceRows = (rows: readonly PriceRow[]) =>
  Effect.gen(function* decodePriceRows() {
    const itemId = decodePersisted(LegendaryItemId, listOperation);
    const itemLevel = decodePersisted(LegendaryItemLevel, listOperation);
    const itemSourceKey = decodePersisted(
      LegendaryItemSourceKey,
      listOperation
    );
    const enemyId = decodePersisted(LegendaryEnemyId, listOperation);
    const enemyLevel = decodePersisted(LegendaryEnemyLevel, listOperation);
    const enemySourceKey = decodePersisted(
      LegendaryEnemySourceKey,
      listOperation
    );
    const iconUrl = decodePersisted(MargonemCdnIconUrl, listOperation);
    const bonus = decodePersisted(LegendaryBonus, listOperation);
    const price = decodePersisted(LegendPriceGold, listOperation);
    const version = decodePersisted(LegendCostVersion, listOperation);
    const summaries = new Map<number, LegendPriceSummary>();

    for (const row of rows) {
      const decodedItemId = yield* itemId(row.item.id);
      const decodedItemSourceKey = yield* itemSourceKey(row.item.sourceIconKey);
      const decodedItemIconUrl = yield* iconUrl(row.item.iconUrl);
      const decodedItemLevel = yield* itemLevel(row.item.level);
      const decodedEnemyId = yield* enemyId(row.enemy.id);
      const decodedEnemySourceKey = yield* enemySourceKey(
        row.enemy.sourceIconKey
      );
      const decodedEnemyIconUrl = yield* iconUrl(row.enemy.iconUrl);
      const decodedEnemyLevel = yield* enemyLevel(row.enemy.level);
      const decodedBonus =
        row.item.legendaryBonus === null
          ? null
          : yield* bonus(row.item.legendaryBonus);
      const decodedPrice =
        row.cost === null ? null : yield* price(row.cost.priceGold);
      const decodedVersion =
        row.cost === null
          ? LegendCostVersion.make(0)
          : yield* version(row.cost.version);
      const enemy: LegendPriceEnemySource = {
        category: row.enemy.category,
        iconUrl: decodedEnemyIconUrl,
        id: decodedEnemyId,
        level: decodedEnemyLevel,
        name: row.enemy.name,
        sourceIconKey: decodedEnemySourceKey,
      };
      const existing = summaries.get(decodedItemId);
      if (existing === undefined) {
        summaries.set(decodedItemId, {
          enemies: [enemy],
          equipmentType: row.item.equipmentType,
          iconUrl: decodedItemIconUrl,
          itemId: decodedItemId,
          lastSyncedAt: row.item.lastSeenAt,
          legendaryBonus: decodedBonus,
          level: decodedItemLevel,
          name: row.item.name,
          priceGold: decodedPrice,
          priceUpdatedAt: row.cost?.updatedAt ?? null,
          professions: [...row.item.professions],
          sourceIconKey: decodedItemSourceKey,
          version: decodedVersion,
        });
      } else if (
        !existing.enemies.some((source) => source.id === decodedEnemyId)
      ) {
        summaries.set(decodedItemId, {
          ...existing,
          enemies: [...existing.enemies, enemy],
        });
      }
    }

    return [...summaries.values()];
  });

const listWithDatabase = (database: EffectPgDatabase) => () =>
  persistenceQuery(listOperation, selectPriceRows(database)).pipe(
    Effect.flatMap((rows) => decodePriceRows(rows))
  );

const updateWithTransaction = (
  tx: TransactionDatabase,
  input: UpdateLegendCostInput
) =>
  Effect.gen(function* updateLegendCostTransaction() {
    const [item] = yield* tx
      .select({ id: legendaryItem.id })
      .from(legendaryItem)
      .where(
        and(eq(legendaryItem.id, input.itemId), eq(legendaryItem.active, true))
      );
    if (item === undefined) {
      return yield* new ApplicationNotFound({
        message: "Legendary item not found",
      });
    }

    if (input.expectedVersion === 0) {
      const inserted = yield* tx
        .insert(legendaryItemCost)
        .values({
          itemId: input.itemId,
          priceGold: input.priceGold,
          updatedBy: input.updatedBy,
          version: 1,
        })
        .onConflictDoNothing({ target: legendaryItemCost.itemId })
        .returning({ itemId: legendaryItemCost.itemId });
      if (inserted.length === 0) {
        return yield* new ApplicationConflict({
          message: "Legendary item cost was updated concurrently",
        });
      }
    } else {
      const updated = yield* tx
        .update(legendaryItemCost)
        .set({
          priceGold: input.priceGold,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
          version: sql`${legendaryItemCost.version} + 1`,
        })
        .where(
          and(
            eq(legendaryItemCost.itemId, input.itemId),
            eq(legendaryItemCost.version, input.expectedVersion)
          )
        )
        .returning({ itemId: legendaryItemCost.itemId });
      if (updated.length === 0) {
        return yield* new ApplicationConflict({
          message: "Legendary item cost was updated concurrently",
        });
      }
    }

    const rows = yield* selectPriceRows(tx, input.itemId);
    const [summary] = yield* decodePriceRows(rows);
    if (summary === undefined) {
      return yield* new ApplicationDependencyUnavailable({
        cause: new Error("Updated legendary item has no active drop source"),
        operation: updateOperation,
      });
    }
    return summary;
  });

const updateWithDatabase =
  (database: EffectPgDatabase) => (input: UpdateLegendCostInput) =>
    persistenceQuery(
      updateOperation,
      database.transaction((tx) => updateWithTransaction(tx, input))
    );

/** Provide PostgreSQL-backed legendary price reads and optimistic writes. */
const getDatabaseSync = EffectDatabase.useSync.bind(EffectDatabase);

export const DrizzleLegendPricingStoreLayer: Layer.Layer<
  LegendPricingStore,
  never,
  EffectDatabase
> = Layer.effect(
  LegendPricingStore,
  getDatabaseSync((database) =>
    LegendPricingStore.of({
      list: Effect.fn("LegendPricingStore.list")(listWithDatabase(database)),
      updateCost: Effect.fn("LegendPricingStore.updateCost")(
        updateWithDatabase(database)
      ),
    })
  )
);

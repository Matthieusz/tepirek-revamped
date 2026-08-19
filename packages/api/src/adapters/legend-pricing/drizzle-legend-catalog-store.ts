import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import {
  legendaryCatalogSyncRun,
  legendaryEnemy,
  legendaryItem,
  legendaryItemDrop,
} from "@tepirek-revamped/db/schema/legend-pricing";
import { and, eq, exists, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  makeLegendaryEnemyFingerprint,
  makeLegendaryItemFingerprint,
} from "../../domain/legend-pricing/legend-catalog.ts";
import {
  LegendCatalogPersistenceUnavailable,
  LegendCatalogSnapshotInvalid,
  LegendCatalogSourceDrift,
  LegendCatalogStoreService,
} from "../../services/legend-pricing/legend-catalog-store.ts";
import type {
  LegendCatalogPersistenceOperation,
  LegendCatalogReconciliationResult,
  ReconcileLegendCatalogInput,
} from "../../services/legend-pricing/legend-catalog-store.ts";
import { makeDirectPersistenceQuery } from "../persistence-query.ts";

const operation = "reconcileLegendCatalog" as const;

const persistenceQuery = makeDirectPersistenceQuery<
  LegendCatalogPersistenceUnavailable,
  LegendCatalogPersistenceOperation
>(
  ({ cause, operation: failedOperation }) =>
    new LegendCatalogPersistenceUnavailable({
      cause,
      operation: failedOperation,
      provider: "postgres",
    })
);

const duplicateValue = <Value>(values: readonly Value[]): Value | undefined => {
  const seen = new Set<Value>();

  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
  }

  return undefined;
};

const enemySourceKey = (input: {
  readonly category: string;
  readonly sourceIconKey: string;
}): string => `${input.category}:${input.sourceIconKey}`;

const validateSnapshot = (
  input: ReconcileLegendCatalogInput
): LegendCatalogSnapshotInvalid | undefined => {
  if (
    Number.isNaN(input.startedAt.getTime()) ||
    Number.isNaN(input.synchronizedAt.getTime()) ||
    input.startedAt.getTime() > input.synchronizedAt.getTime()
  ) {
    return new LegendCatalogSnapshotInvalid({
      reason: "synchronization timestamps must form a valid interval",
    });
  }
  if (input.enemies.length === 0 || input.items.length === 0) {
    return new LegendCatalogSnapshotInvalid({
      reason: "a complete snapshot must contain enemies and items",
    });
  }

  const categories = new Set(input.enemies.map((enemy) => enemy.category));
  if (!(categories.has("hero") && categories.has("elite2"))) {
    return new LegendCatalogSnapshotInvalid({
      reason: "a complete snapshot must contain both enemy categories",
    });
  }
  const sourcePostCategories = new Set(
    input.sourcePosts.map((post) => post.category)
  );
  if (
    input.sourcePosts.length === 0 ||
    !sourcePostCategories.has("hero") ||
    !sourcePostCategories.has("elite2")
  ) {
    return new LegendCatalogSnapshotInvalid({
      reason:
        "a complete snapshot must identify official posts for both categories",
    });
  }

  const duplicateEnemyKey = duplicateValue(input.enemies.map(enemySourceKey));
  if (duplicateEnemyKey !== undefined) {
    return new LegendCatalogSnapshotInvalid({
      reason: `duplicate enemy source key ${duplicateEnemyKey}`,
    });
  }

  const duplicateItemKey = duplicateValue(
    input.items.map((item) => item.sourceIconKey)
  );
  if (duplicateItemKey !== undefined) {
    return new LegendCatalogSnapshotInvalid({
      reason: `duplicate item source key ${duplicateItemKey}`,
    });
  }

  const enemyKeys = new Set(input.enemies.map(enemySourceKey));
  const itemKeys = new Set(input.items.map((item) => item.sourceIconKey));
  const dropKeys = input.drops.map(
    (drop) =>
      `${drop.itemSourceIconKey}:${drop.enemyCategory}:${drop.enemySourceIconKey}`
  );
  if (new Set(dropKeys).size !== dropKeys.length) {
    return new LegendCatalogSnapshotInvalid({
      reason: "duplicate item-to-enemy drop relation",
    });
  }

  const droppedItemKeys = new Set<string>();
  for (const drop of input.drops) {
    const dropEnemyKey = enemySourceKey({
      category: drop.enemyCategory,
      sourceIconKey: drop.enemySourceIconKey,
    });
    if (!enemyKeys.has(dropEnemyKey)) {
      return new LegendCatalogSnapshotInvalid({
        reason: `drop references unknown enemy source key ${dropEnemyKey}`,
      });
    }
    if (!itemKeys.has(drop.itemSourceIconKey)) {
      return new LegendCatalogSnapshotInvalid({
        reason: `drop references unknown item source key ${drop.itemSourceIconKey}`,
      });
    }
    droppedItemKeys.add(drop.itemSourceIconKey);
  }

  if (droppedItemKeys.size !== itemKeys.size) {
    return new LegendCatalogSnapshotInvalid({
      reason: "every catalog item must have a current drop source",
    });
  }

  return undefined;
};

interface ActivityTransitions {
  readonly activated: number;
  readonly deactivated: number;
}

const countActivityTransitions = (
  before: readonly {
    readonly active: boolean;
    readonly sourceKey: string;
  }[],
  after: readonly {
    readonly active: boolean;
    readonly sourceKey: string;
  }[]
): ActivityTransitions => {
  const previousActivityByKey = new Map(
    before.map((record) => [record.sourceKey, record.active] as const)
  );
  let activated = 0;
  let deactivated = 0;

  for (const record of after) {
    const previousActivity = previousActivityByKey.get(record.sourceKey);
    if (record.active && previousActivity !== true) {
      activated += 1;
    } else if (!record.active && previousActivity === true) {
      deactivated += 1;
    }
  }

  return { activated, deactivated };
};

const reconcileWithTransaction = (
  tx: TransactionDatabase,
  input: ReconcileLegendCatalogInput
) =>
  Effect.gen(function* reconcileLegendCatalogTransaction() {
    yield* tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('legend-catalog-reconciliation'))`
    );

    const enemiesBefore = yield* tx
      .select({
        active: legendaryEnemy.active,
        category: legendaryEnemy.category,
        sourceFingerprint: legendaryEnemy.sourceFingerprint,
        sourceIconKey: legendaryEnemy.sourceIconKey,
      })
      .from(legendaryEnemy);
    const itemsBefore = yield* tx
      .select({
        active: legendaryItem.active,
        sourceFingerprint: legendaryItem.sourceFingerprint,
        sourceIconKey: legendaryItem.sourceIconKey,
      })
      .from(legendaryItem);
    const existingEnemyByKey = new Map(
      enemiesBefore.map((enemy) => [enemySourceKey(enemy), enemy] as const)
    );
    const existingItemByKey = new Map(
      itemsBefore.map((item) => [item.sourceIconKey, item] as const)
    );

    for (const enemy of input.enemies) {
      const sourceKey = enemySourceKey(enemy);
      const existing = existingEnemyByKey.get(sourceKey);
      const incomingFingerprint = makeLegendaryEnemyFingerprint(enemy);
      if (
        existing !== undefined &&
        existing.sourceFingerprint !== incomingFingerprint
      ) {
        return yield* new LegendCatalogSourceDrift({
          entityType: "enemy",
          existingFingerprint: existing.sourceFingerprint,
          incomingFingerprint,
          sourceKey,
        });
      }
    }
    for (const item of input.items) {
      const existing = existingItemByKey.get(item.sourceIconKey);
      const incomingFingerprint = makeLegendaryItemFingerprint(item);
      if (
        existing !== undefined &&
        existing.sourceFingerprint !== incomingFingerprint
      ) {
        return yield* new LegendCatalogSourceDrift({
          entityType: "item",
          existingFingerprint: existing.sourceFingerprint,
          incomingFingerprint,
          sourceKey: item.sourceIconKey,
        });
      }
    }

    yield* tx.update(legendaryEnemy).set({ active: false });

    const enemyDatabaseIds = new Map<string, number>();
    for (const enemy of input.enemies) {
      const sourceFingerprint = makeLegendaryEnemyFingerprint(enemy);
      const rows = yield* tx
        .insert(legendaryEnemy)
        .values({
          active: true,
          category: enemy.category,
          iconUrl: enemy.iconUrl,
          lastSeenAt: input.synchronizedAt,
          level: enemy.level,
          name: enemy.name,
          profession: enemy.profession,
          sourceFingerprint,
          sourceIconKey: enemy.sourceIconKey,
          sourcePostId: enemy.sourcePostId,
          sourceUrl: enemy.sourceUrl,
        })
        .onConflictDoUpdate({
          set: {
            active: true,
            iconUrl: enemy.iconUrl,
            lastSeenAt: input.synchronizedAt,
            profession: enemy.profession,
            sourcePostId: enemy.sourcePostId,
            sourceUrl: enemy.sourceUrl,
          },
          target: [legendaryEnemy.category, legendaryEnemy.sourceIconKey],
        })
        .returning({
          category: legendaryEnemy.category,
          id: legendaryEnemy.id,
          sourceIconKey: legendaryEnemy.sourceIconKey,
        });
      const [persisted] = rows;
      if (persisted === undefined) {
        return yield* new LegendCatalogPersistenceUnavailable({
          cause: new Error("Enemy upsert returned no row"),
          operation,
          provider: "postgres",
        });
      }
      enemyDatabaseIds.set(enemySourceKey(persisted), persisted.id);
    }

    const itemDatabaseIds = new Map<string, number>();
    for (const item of input.items) {
      const sourceFingerprint = makeLegendaryItemFingerprint(item);
      const rows = yield* tx
        .insert(legendaryItem)
        .values({
          equipmentType: item.equipmentType,
          iconUrl: item.iconUrl,
          lastSeenAt: input.synchronizedAt,
          legendaryBonus: item.legendaryBonus,
          level: item.level,
          name: item.name,
          professions: [...item.professions],
          sourceFingerprint,
          sourceIconKey: item.sourceIconKey,
        })
        .onConflictDoUpdate({
          set: {
            iconUrl: item.iconUrl,
            lastSeenAt: input.synchronizedAt,
            legendaryBonus: item.legendaryBonus,
            professions: [...item.professions],
          },
          target: legendaryItem.sourceIconKey,
        })
        .returning({
          id: legendaryItem.id,
          sourceIconKey: legendaryItem.sourceIconKey,
        });
      const [persisted] = rows;
      if (persisted === undefined) {
        return yield* new LegendCatalogPersistenceUnavailable({
          cause: new Error("Item upsert returned no row"),
          operation,
          provider: "postgres",
        });
      }
      itemDatabaseIds.set(persisted.sourceIconKey, persisted.id);
    }

    yield* tx.delete(legendaryItemDrop);
    const dropRows = [];
    for (const drop of input.drops) {
      const enemyId = enemyDatabaseIds.get(
        enemySourceKey({
          category: drop.enemyCategory,
          sourceIconKey: drop.enemySourceIconKey,
        })
      );
      const itemId = itemDatabaseIds.get(drop.itemSourceIconKey);
      if (enemyId === undefined || itemId === undefined) {
        return yield* new LegendCatalogSnapshotInvalid({
          reason: "validated drop relation could not be resolved",
        });
      }
      dropRows.push({ enemyId, itemId });
    }
    yield* tx.insert(legendaryItemDrop).values(dropRows);

    yield* tx.update(legendaryItem).set({ active: false });
    yield* tx
      .update(legendaryItem)
      .set({ active: true })
      .where(
        exists(
          tx
            .select({ itemId: legendaryItemDrop.itemId })
            .from(legendaryItemDrop)
            .innerJoin(
              legendaryEnemy,
              eq(legendaryEnemy.id, legendaryItemDrop.enemyId)
            )
            .where(
              and(
                eq(legendaryItemDrop.itemId, legendaryItem.id),
                eq(legendaryEnemy.active, true)
              )
            )
        )
      );

    const enemiesAfter = yield* tx
      .select({
        active: legendaryEnemy.active,
        category: legendaryEnemy.category,
        sourceIconKey: legendaryEnemy.sourceIconKey,
      })
      .from(legendaryEnemy);
    const itemsAfter = yield* tx
      .select({
        active: legendaryItem.active,
        sourceIconKey: legendaryItem.sourceIconKey,
      })
      .from(legendaryItem);
    const enemyTransitions = countActivityTransitions(
      enemiesBefore.map((enemy) => ({
        active: enemy.active,
        sourceKey: enemySourceKey(enemy),
      })),
      enemiesAfter.map((enemy) => ({
        active: enemy.active,
        sourceKey: enemySourceKey(enemy),
      }))
    );
    const itemTransitions = countActivityTransitions(
      itemsBefore.map((item) => ({
        active: item.active,
        sourceKey: item.sourceIconKey,
      })),
      itemsAfter.map((item) => ({
        active: item.active,
        sourceKey: item.sourceIconKey,
      }))
    );
    const result = {
      activatedEnemyCount: enemyTransitions.activated,
      activatedItemCount: itemTransitions.activated,
      deactivatedEnemyCount: enemyTransitions.deactivated,
      deactivatedItemCount: itemTransitions.deactivated,
    } satisfies LegendCatalogReconciliationResult;

    yield* tx.insert(legendaryCatalogSyncRun).values({
      ...result,
      enemyCount: input.enemies.length,
      finishedAt: input.synchronizedAt,
      itemCount: input.items.length,
      sourcePosts: input.sourcePosts,
      startedAt: input.startedAt,
      status: "succeeded",
    });

    return result;
  });

const reconcileWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* reconcileLegendCatalog(
    input: ReconcileLegendCatalogInput
  ) {
    const validationError = validateSnapshot(input);
    if (validationError !== undefined) {
      return yield* validationError;
    }

    return yield* persistenceQuery(
      operation,
      database.transaction((tx) => reconcileWithTransaction(tx, input))
    );
  });

const recordFailureWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* recordLegendCatalogSyncFailure(
    input: Parameters<LegendCatalogStoreService["Service"]["recordFailure"]>[0]
  ) {
    yield* persistenceQuery(
      "recordLegendCatalogSyncFailure",
      database.insert(legendaryCatalogSyncRun).values({
        enemyCount: 0,
        errorMessage: input.errorMessage,
        errorTag: input.errorTag,
        finishedAt: input.finishedAt,
        itemCount: 0,
        sourcePosts: input.sourcePosts,
        startedAt: input.startedAt,
        status: "failed",
      })
    );
  });

/** Provide atomic legend-catalog reconciliation with its Drizzle implementation. */
export const DrizzleLegendCatalogStoreServiceLayer: Layer.Layer<
  LegendCatalogStoreService,
  never,
  EffectDatabase
> = Layer.effect(
  LegendCatalogStoreService,
  EffectDatabase.useSync((database) =>
    LegendCatalogStoreService.of({
      reconcile: Effect.fn("LegendCatalogStore.reconcile")(
        reconcileWithDatabase(database)
      ),
      recordFailure: Effect.fn("LegendCatalogStore.recordFailure")(
        recordFailureWithDatabase(database)
      ),
    })
  )
);

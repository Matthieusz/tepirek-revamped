/* eslint-disable max-classes-per-file -- The synchronizer exposes one cohesive failure algebra. */
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";

import { MargonemForumClientService } from "../../adapters/legend-pricing/margonem-forum/margonem-forum-client.ts";
import type { MargonemForumClientError } from "../../adapters/legend-pricing/margonem-forum/margonem-forum-client.ts";
import { parseMargonemForumTopic } from "../../adapters/legend-pricing/margonem-forum/margonem-forum-parser.ts";
import type { MargonemForumGuideNotParseable } from "../../adapters/legend-pricing/margonem-forum/margonem-forum-parser.ts";
import type {
  LegendaryEnemyCategory,
  LegendaryItemSourceKey,
} from "../../domain/legend-pricing/legend-catalog.ts";
import type {
  LegendCatalogDrop,
  LegendCatalogEnemy,
  LegendCatalogItem,
  LegendCatalogReconciliationResult,
  LegendCatalogSourcePost,
  ReconcileLegendCatalogInput,
  ReconcileLegendCatalogError,
} from "./legend-catalog-store.ts";
import { LegendCatalogStoreService } from "./legend-catalog-store.ts";

/** Failure when both complete topics cannot form one internally consistent snapshot. */
export class LegendCatalogSyncSnapshotInvalid extends Schema.TaggedErrorClass<LegendCatalogSyncSnapshotInvalid>()(
  "LegendCatalogSyncSnapshotInvalid",
  { reason: Schema.String }
) {}

/** Expected failures from one complete catalog synchronization. */
export type LegendCatalogSyncError =
  | LegendCatalogSyncSnapshotInvalid
  | MargonemForumClientError
  | MargonemForumGuideNotParseable
  | ReconcileLegendCatalogError;

/** Result of a successful synchronization. */
export interface LegendCatalogSyncResult {
  readonly reconciliation: LegendCatalogReconciliationResult;
  readonly synchronizedAt: Date;
}

/** Capability for downloading, parsing, and atomically publishing both guide topics. */
export interface LegendCatalogSyncContract {
  readonly synchronize: () => Effect.Effect<
    LegendCatalogSyncResult,
    LegendCatalogSyncError
  >;
}

/** Service tag for an explicitly invoked catalog synchronization. */
export class LegendCatalogSyncService extends Context.Service<
  LegendCatalogSyncService,
  LegendCatalogSyncContract
>()("@tepirek-revamped/api/legend-pricing/LegendCatalogSyncService") {}

const syncErrorMessage = (error: LegendCatalogSyncError): string => {
  switch (error._tag) {
    case "LegendCatalogPersistenceUnavailable": {
      return `persistence failure while ${error.operation}`;
    }
    case "LegendCatalogSnapshotInvalid": {
      return error.reason;
    }
    case "LegendCatalogSourceDrift": {
      return `source drift for ${error.entityType} ${error.sourceKey}`;
    }
    case "MargonemForumDocumentRejected": {
      return error.reason;
    }
    case "MargonemForumGuideNotParseable": {
      return error.reason;
    }
    case "MargonemForumRequestFailed": {
      return error.status === undefined
        ? "forum request failed"
        : `forum request failed with status ${error.status}`;
    }
    case "LegendCatalogSyncSnapshotInvalid": {
      return error.reason;
    }
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
};

const topicUrl = (category: LegendaryEnemyCategory): string =>
  category === "hero"
    ? "https://forum.margonem.pl/?task=forum&show=posts&id=514740&ps=0"
    : "https://forum.margonem.pl/?task=forum&show=posts&id=514805&ps=0";

const mergeItems = (
  snapshots: readonly {
    readonly items: readonly LegendCatalogItem[];
  }[]
): Effect.Effect<
  readonly LegendCatalogItem[],
  LegendCatalogSyncSnapshotInvalid
> => {
  const items = new Map<LegendaryItemSourceKey, LegendCatalogItem>();
  for (const snapshot of snapshots) {
    for (const item of snapshot.items) {
      const existing = items.get(item.sourceIconKey);
      if (
        existing !== undefined &&
        (existing.name !== item.name ||
          existing.level !== item.level ||
          existing.equipmentType !== item.equipmentType)
      ) {
        return Effect.fail(
          new LegendCatalogSyncSnapshotInvalid({
            reason: `item metadata differs for source key ${item.sourceIconKey}`,
          })
        );
      }
      items.set(item.sourceIconKey, existing ?? item);
    }
  }
  return Effect.succeed([...items.values()]);
};

const makeInput = (
  hero: {
    readonly drops: readonly LegendCatalogDrop[];
    readonly enemies: readonly LegendCatalogEnemy[];
    readonly items: readonly LegendCatalogItem[];
    readonly sourcePosts: readonly LegendCatalogSourcePost[];
  },
  elite2: {
    readonly drops: readonly LegendCatalogDrop[];
    readonly enemies: readonly LegendCatalogEnemy[];
    readonly items: readonly LegendCatalogItem[];
    readonly sourcePosts: readonly LegendCatalogSourcePost[];
  },
  startedAt: Date,
  synchronizedAt: Date
): Effect.Effect<
  ReconcileLegendCatalogInput,
  LegendCatalogSyncSnapshotInvalid
> =>
  mergeItems([hero, elite2]).pipe(
    Effect.map((items) => ({
      drops: [...hero.drops, ...elite2.drops],
      enemies: [...hero.enemies, ...elite2.enemies],
      items,
      sourcePosts: [...hero.sourcePosts, ...elite2.sourcePosts],
      startedAt,
      synchronizedAt,
    }))
  );

const parseTopic = (category: LegendaryEnemyCategory, html: string) =>
  parseMargonemForumTopic({
    category,
    html,
    url: topicUrl(category),
  }).pipe(
    Effect.map((snapshot) => ({
      drops: snapshot.drops.map((drop) => ({
        enemyCategory: drop.enemyCategory,
        enemySourceIconKey: drop.enemySourceIconKey,
        itemSourceIconKey: drop.itemSourceIconKey,
      })),
      enemies: snapshot.enemies,
      items: snapshot.items,
      sourcePosts: snapshot.sourcePosts,
    }))
  );

/** Build the live synchronizer; no synchronization starts during layer acquisition. */
export const LegendCatalogSyncLiveLayer: Layer.Layer<
  LegendCatalogSyncService,
  never,
  MargonemForumClientService | LegendCatalogStoreService
> = Layer.effect(
  LegendCatalogSyncService,
  Effect.gen(function* legendCatalogSyncLiveLayer() {
    const forum = yield* MargonemForumClientService;
    const store = yield* LegendCatalogStoreService;
    const synchronizationSemaphore = yield* Semaphore.make(1);

    const synchronizeOnce = Effect.fnUntraced(
      function* synchronizeLegendCatalogOnce() {
        const startedAt = new Date(yield* Clock.currentTimeMillis);
        const run = Effect.gen(function* synchronizeCatalog() {
          const topics = yield* Effect.all(
            {
              elite2: forum.fetchTopic("elite2"),
              hero: forum.fetchTopic("hero"),
            },
            { concurrency: 2 }
          );
          const snapshots = yield* Effect.all(
            {
              elite2: parseTopic("elite2", topics.elite2.html),
              hero: parseTopic("hero", topics.hero.html),
            },
            { concurrency: 2 }
          );
          const synchronizedAt = new Date(yield* Clock.currentTimeMillis);
          const input = yield* makeInput(
            snapshots.hero,
            snapshots.elite2,
            startedAt,
            synchronizedAt
          );
          const reconciliation = yield* store.reconcile(input);
          return { reconciliation, synchronizedAt };
        });

        return yield* run.pipe(
          Effect.catch((error) =>
            Effect.gen(function* recordSynchronizationFailure() {
              const finishedAt = new Date(yield* Clock.currentTimeMillis);
              yield* store
                .recordFailure({
                  errorMessage: syncErrorMessage(error),
                  errorTag: error._tag,
                  finishedAt,
                  sourcePosts: [],
                  startedAt,
                })
                .pipe(Effect.ignore());
              return yield* error;
            })
          )
        );
      }
    );

    const synchronize = Effect.fn("LegendCatalogSync.synchronize")(
      function* synchronizeLegendCatalog() {
        return yield* Semaphore.withPermits(
          synchronizationSemaphore,
          1,
          synchronizeOnce()
        );
      }
    );

    return LegendCatalogSyncService.of({ synchronize });
  })
);

/* eslint-disable max-classes-per-file -- Collocated legend-catalog persistence errors form one boundary. */
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as Schema from "effect/Schema";

import type {
  LegendaryBonus,
  LegendaryEnemyCategory,
  LegendaryEnemyLevel,
  LegendaryEnemySourceKey,
  LegendaryEquipmentType,
  LegendaryItemLevel,
  LegendaryItemSourceKey,
  LegendaryProfession,
  MargonemCdnIconUrl,
  MargonemForumPostId,
} from "../../domain/legend-pricing/legend-catalog.ts";

/** A parsed current enemy ready for catalog persistence. */
export interface LegendCatalogEnemy {
  readonly category: LegendaryEnemyCategory;
  readonly iconUrl: MargonemCdnIconUrl;
  readonly level: LegendaryEnemyLevel;
  readonly name: string;
  readonly profession: LegendaryProfession | null;
  readonly sourceIconKey: LegendaryEnemySourceKey;
  readonly sourcePostId: MargonemForumPostId;
  readonly sourceUrl: string;
}

/** Parsed legendary equipment metadata ready for catalog persistence. */
export interface LegendCatalogItem {
  readonly equipmentType: LegendaryEquipmentType;
  readonly iconUrl: MargonemCdnIconUrl;
  readonly legendaryBonus: LegendaryBonus | null;
  readonly level: LegendaryItemLevel;
  readonly name: string;
  readonly professions: readonly LegendaryProfession[];
  readonly sourceIconKey: LegendaryItemSourceKey;
}

/** A current item-to-enemy drop relation expressed with source identities. */
export interface LegendCatalogDrop {
  readonly enemyCategory: LegendaryEnemyCategory;
  readonly enemySourceIconKey: LegendaryEnemySourceKey;
  readonly itemSourceIconKey: LegendaryItemSourceKey;
}

/** Official post metadata recorded with a successful reconciliation. */
export interface LegendCatalogSourcePost {
  readonly category: LegendaryEnemyCategory;
  readonly editedAt: string | null;
  readonly postId: MargonemForumPostId;
}

/** A complete, parsed forum catalog snapshot to reconcile atomically. */
export interface ReconcileLegendCatalogInput {
  readonly drops: readonly LegendCatalogDrop[];
  readonly enemies: readonly LegendCatalogEnemy[];
  readonly items: readonly LegendCatalogItem[];
  readonly sourcePosts: readonly LegendCatalogSourcePost[];
  readonly startedAt: Date;
  readonly synchronizedAt: Date;
}

/** Counts of catalog records whose activity changed during reconciliation. */
export interface LegendCatalogReconciliationResult {
  readonly activatedEnemyCount: number;
  readonly activatedItemCount: number;
  readonly deactivatedEnemyCount: number;
  readonly deactivatedItemCount: number;
}

/** Safe diagnostic fields for a failed synchronization attempt. */
export interface LegendCatalogSyncFailure {
  readonly errorMessage: string;
  readonly errorTag: string;
  readonly finishedAt: Date;
  readonly sourcePosts: readonly LegendCatalogSourcePost[];
  readonly startedAt: Date;
}

/** Supported legend-catalog persistence operations. */
export type LegendCatalogPersistenceOperation =
  | "recordLegendCatalogSyncFailure"
  | "reconcileLegendCatalog";

/** A complete snapshot was internally inconsistent and was not persisted. */
export class LegendCatalogSnapshotInvalid extends Schema.TaggedErrorClass<LegendCatalogSnapshotInvalid>()(
  "LegendCatalogSnapshotInvalid",
  { reason: Schema.String }
) {}

/** Existing source identity metadata differs from the incoming fingerprint. */
export class LegendCatalogSourceDrift extends Schema.TaggedErrorClass<LegendCatalogSourceDrift>()(
  "LegendCatalogSourceDrift",
  {
    entityType: Schema.Literals(["enemy", "item"]),
    existingFingerprint: Schema.String,
    incomingFingerprint: Schema.String,
    sourceKey: Schema.String,
  }
) {}

/** PostgreSQL could not reconcile the complete legend catalog snapshot. */
export class LegendCatalogPersistenceUnavailable extends Schema.TaggedErrorClass<LegendCatalogPersistenceUnavailable>()(
  "LegendCatalogPersistenceUnavailable",
  {
    cause: Schema.Defect(),
    operation: Schema.Literals([
      "recordLegendCatalogSyncFailure",
      "reconcileLegendCatalog",
    ]),
    provider: Schema.Literal("postgres"),
  }
) {}

/** Failures expected while atomically reconciling the legend catalog. */
export type ReconcileLegendCatalogError =
  | LegendCatalogPersistenceUnavailable
  | LegendCatalogSnapshotInvalid
  | LegendCatalogSourceDrift;

/** Persistence contract for replacing the current catalog without touching prices. */
export interface LegendCatalogStoreContract {
  readonly recordFailure: (
    input: LegendCatalogSyncFailure
  ) => Effect<void, LegendCatalogPersistenceUnavailable>;
  readonly reconcile: (
    input: ReconcileLegendCatalogInput
  ) => Effect<LegendCatalogReconciliationResult, ReconcileLegendCatalogError>;
}

/** Atomic persistence access for complete legend catalog snapshots. */
export class LegendCatalogStoreService extends Context.Service<
  LegendCatalogStoreService,
  LegendCatalogStoreContract
>()("@tepirek-revamped/api/legend-pricing/LegendCatalogStoreService") {}

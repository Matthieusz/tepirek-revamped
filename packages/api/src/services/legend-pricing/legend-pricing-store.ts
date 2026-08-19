import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

import type {
  LegendaryBonus,
  LegendaryEnemyCategory,
  LegendaryEnemyId,
  LegendaryEnemyLevel,
  LegendaryEnemySourceKey,
  LegendaryEquipmentType,
  LegendaryItemId,
  LegendaryItemLevel,
  LegendaryItemSourceKey,
  LegendaryProfession,
  LegendPriceGold,
  MargonemCdnIconUrl,
  LegendCostVersion,
} from "../../domain/legend-pricing/legend-catalog.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type {
  ApplicationConflict,
  ApplicationDependencyUnavailable,
  ApplicationNotFound,
} from "../application-errors.ts";

/** One active enemy source for a legendary item. */
export interface LegendPriceEnemySource {
  readonly category: LegendaryEnemyCategory;
  readonly iconUrl: MargonemCdnIconUrl;
  readonly id: LegendaryEnemyId;
  readonly level: LegendaryEnemyLevel;
  readonly name: string;
  readonly sourceIconKey: LegendaryEnemySourceKey;
}

/** One item and its administrator-managed cost. */
export interface LegendPriceSummary {
  readonly equipmentType: LegendaryEquipmentType;
  readonly iconUrl: MargonemCdnIconUrl;
  readonly itemId: LegendaryItemId;
  readonly lastSyncedAt: Date;
  readonly legendaryBonus: LegendaryBonus | null;
  readonly level: LegendaryItemLevel;
  readonly name: string;
  readonly priceGold: LegendPriceGold | null;
  readonly priceUpdatedAt: Date | null;
  readonly professions: readonly LegendaryProfession[];
  readonly sourceIconKey: LegendaryItemSourceKey;
  readonly version: LegendCostVersion;
  readonly enemies: readonly LegendPriceEnemySource[];
}

/** Input for an optimistic administrator price update. */
export interface UpdateLegendCostInput {
  readonly expectedVersion: LegendCostVersion;
  readonly itemId: LegendaryItemId;
  readonly priceGold: LegendPriceGold;
  readonly updatedBy: AppUserId;
}

/** Persistence port for reading active prices and changing one cost atomically. */
export class LegendPricingStore extends Context.Service<
  LegendPricingStore,
  {
    readonly list: () => Effect.Effect<
      readonly LegendPriceSummary[],
      ApplicationDependencyUnavailable
    >;
    readonly updateCost: (
      input: UpdateLegendCostInput
    ) => Effect.Effect<
      LegendPriceSummary,
      | ApplicationConflict
      | ApplicationDependencyUnavailable
      | ApplicationNotFound
    >;
  }
>()("@tepirek-revamped/api/LegendPricingStore") {}

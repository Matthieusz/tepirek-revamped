/* eslint-disable typescript/no-empty-interface, typescript/no-empty-object-type -- Contract interfaces expose inferred schema types to callers. */
/* eslint-disable max-classes-per-file -- Endpoint errors belong to one closed protocol boundary. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
  LegendaryEnemyCategory,
  LegendaryEnemyId,
  LegendaryEnemyLevel,
  LegendaryEnemySourceKey,
  LegendaryEquipmentType,
  LegendaryItemId,
  LegendaryItemLevel,
  LegendaryItemSourceKey,
  LegendaryProfession,
  LegendCostVersion,
  LegendPriceGold,
  MargonemCdnIconUrl,
  LegendaryBonus,
} from "../../domain/legend-pricing/legend-catalog.ts";

export {
  LegendaryEnemyCategory,
  LegendaryEnemyId,
  LegendaryEnemyLevel,
  LegendaryEnemySourceKey,
  LegendaryEquipmentType,
  LegendaryItemId,
  LegendaryItemLevel,
  LegendaryItemSourceKey,
  LegendaryProfession,
  LegendCostVersion,
  LegendPriceGold,
  MargonemCdnIconUrl,
  LegendaryBonus,
} from "../../domain/legend-pricing/legend-catalog.ts";

/** Payload for an administrator price update using optimistic concurrency. */
export const UpdateLegendCostPayload = Schema.Struct({
  expectedVersion: LegendCostVersion,
  itemId: LegendaryItemId,
  priceGold: LegendPriceGold,
});
export interface UpdateLegendCostPayload extends Schema.Schema.Type<
  typeof UpdateLegendCostPayload
> {}

/** An active enemy source shown for a legendary item. */
export const LegendPriceEnemySource = Schema.Struct({
  category: LegendaryEnemyCategory,
  iconUrl: MargonemCdnIconUrl,
  id: LegendaryEnemyId,
  level: LegendaryEnemyLevel,
  name: Schema.NonEmptyString,
  sourceIconKey: LegendaryEnemySourceKey,
});
export interface LegendPriceEnemySource extends Schema.Schema.Type<
  typeof LegendPriceEnemySource
> {}

/** Item metadata, active sources, and its optional administrator cost. */
export const LegendPriceSummary = Schema.Struct({
  enemies: Schema.Array(LegendPriceEnemySource),
  equipmentType: LegendaryEquipmentType,
  iconUrl: MargonemCdnIconUrl,
  itemId: LegendaryItemId,
  lastSyncedAt: Schema.DateFromString,
  legendaryBonus: Schema.NullOr(LegendaryBonus),
  level: LegendaryItemLevel,
  name: Schema.NonEmptyString,
  priceGold: Schema.NullOr(LegendPriceGold),
  priceUpdatedAt: Schema.NullOr(Schema.DateFromString),
  professions: Schema.Array(LegendaryProfession),
  sourceIconKey: LegendaryItemSourceKey,
  version: LegendCostVersion,
});
export interface LegendPriceSummary extends Schema.Schema.Type<
  typeof LegendPriceSummary
> {}

export class LegendPricingUnauthorized extends Schema.TaggedErrorClass<LegendPricingUnauthorized>()(
  "LegendPricingUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

export class LegendPricingForbidden extends Schema.TaggedErrorClass<LegendPricingForbidden>()(
  "LegendPricingForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

export class LegendPricingBadRequest extends Schema.TaggedErrorClass<LegendPricingBadRequest>()(
  "LegendPricingBadRequest",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}

export class LegendPricingConflict extends Schema.TaggedErrorClass<LegendPricingConflict>()(
  "LegendPricingConflict",
  { message: Schema.String },
  { httpApiStatus: 409 }
) {}

export class LegendPricingNotFound extends Schema.TaggedErrorClass<LegendPricingNotFound>()(
  "LegendPricingNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}

export class LegendPricingPersistenceUnavailable extends Schema.TaggedErrorClass<LegendPricingPersistenceUnavailable>()(
  "LegendPricingPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 500 }
) {}

export const LegendPricingError = Schema.Union([
  LegendPricingUnauthorized,
  LegendPricingForbidden,
  LegendPricingBadRequest,
  LegendPricingConflict,
  LegendPricingNotFound,
  LegendPricingPersistenceUnavailable,
]);

/** HTTP API group for verified reads and administrator-only price changes. */
export const LegendPricingHttpApiGroup = HttpApiGroup.make("legendPricing")
  .add(
    HttpApiEndpoint.get("listLegendPrices", "/", {
      error: LegendPricingError,
      success: Schema.Array(LegendPriceSummary),
    }),
    HttpApiEndpoint.post("updateLegendCost", "/cost", {
      error: LegendPricingError,
      payload: UpdateLegendCostPayload,
      success: LegendPriceSummary,
    })
  )
  .prefix("/legend-pricing");

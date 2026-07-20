/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { EventIdSchema, HeroIdSchema } from "../../domain/core-identifiers.ts";
import { AppUserIdSchema } from "../../domain/squad-builder/app-user-id.ts";
import { SessionMiddleware } from "../auth/http-api-middleware.ts";

export { EventIdSchema, HeroIdSchema };

const PositiveNumber = Schema.Number.check(Schema.isGreaterThan(0));
const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);
export const DistributeGoldPayload = Schema.Struct({
  goldAmount: PositiveNumber,
  heroId: HeroIdSchema,
});
export const EventFilterPayload = Schema.Struct({
  eventId: Schema.optionalKey(EventIdSchema),
});
export const TogglePaidOutPayload = Schema.Struct({
  eventId: EventIdSchema,
  paidOut: Schema.Boolean,
  userId: AppUserIdSchema,
});
export const DistributeGoldSuccess = Schema.Struct({
  goldAmount: PositiveNumber,
  heroId: HeroIdSchema,
  heroName: Schema.String,
  pointWorth: Schema.Number,
  success: Schema.Boolean,
  totalPoints: Schema.Number,
  usersUpdated: Schema.Number,
});
export const UserStatsRow = Schema.Struct({
  bets: Schema.Number,
  earnings: Schema.String,
  eventId: EventIdSchema,
  heroId: HeroIdSchema,
  id: PositiveInt,
  paidOut: Schema.Boolean,
  points: Schema.String,
  userId: AppUserIdSchema,
});
export const VaultRow = Schema.Struct({
  paidOut: Schema.Boolean,
  totalEarnings: Schema.String,
  userId: AppUserIdSchema,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.NullOr(Schema.String),
});
export const MutationSuccess = Schema.Struct({ success: Schema.Boolean });

export class VaultUnauthorized extends Schema.TaggedErrorClass<VaultUnauthorized>()(
  "VaultUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}
export class VaultForbidden extends Schema.TaggedErrorClass<VaultForbidden>()(
  "VaultForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}
export class VaultBadRequest extends Schema.TaggedErrorClass<VaultBadRequest>()(
  "VaultBadRequest",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}
export class VaultNotFound extends Schema.TaggedErrorClass<VaultNotFound>()(
  "VaultNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}
export class VaultPersistenceUnavailable extends Schema.TaggedErrorClass<VaultPersistenceUnavailable>()(
  "VaultPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 500 }
) {}

export const VaultError = Schema.Union([
  VaultUnauthorized,
  VaultForbidden,
  VaultBadRequest,
  VaultNotFound,
  VaultPersistenceUnavailable,
]);

export const VaultHttpApiGroup = HttpApiGroup.make("vault")
  .add(
    HttpApiEndpoint.post("distributeGold", "/distribute-gold", {
      error: VaultError,
      payload: DistributeGoldPayload,
      success: DistributeGoldSuccess,
    }),
    HttpApiEndpoint.post("getUserStats", "/user-stats", {
      error: VaultError,
      payload: EventFilterPayload,
      success: Schema.Array(UserStatsRow),
    }),
    HttpApiEndpoint.post("getVault", "/", {
      error: VaultError,
      payload: EventFilterPayload,
      success: Schema.Array(VaultRow),
    }),
    HttpApiEndpoint.post("togglePaidOut", "/toggle-paid-out", {
      error: VaultError,
      payload: TogglePaidOutPayload,
      success: MutationSuccess,
    })
  )
  .middleware(SessionMiddleware)
  .prefix("/vault");

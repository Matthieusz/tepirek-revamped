/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

const PositiveNumber = Schema.Number.check(Schema.isGreaterThan(0));
const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);
const OptionalPositiveInt = Schema.optional(PositiveInt);

export const DistributeGoldPayload = Schema.Struct({
  goldAmount: PositiveNumber,
  heroId: PositiveInt,
});
export const EventFilterPayload = Schema.Struct({
  eventId: OptionalPositiveInt,
});
export const TogglePaidOutPayload = Schema.Struct({
  eventId: PositiveInt,
  paidOut: Schema.Boolean,
  userId: Schema.NonEmptyString,
});
export const DistributeGoldSuccess = Schema.Struct({
  goldAmount: PositiveNumber,
  heroId: PositiveInt,
  heroName: Schema.String,
  pointWorth: Schema.Number,
  success: Schema.Boolean,
  totalPoints: Schema.Number,
  usersUpdated: Schema.Number,
});
export const UserStatsRow = Schema.Struct({
  bets: Schema.Number,
  earnings: Schema.String,
  eventId: PositiveInt,
  heroId: PositiveInt,
  id: PositiveInt,
  paidOut: Schema.Boolean,
  points: Schema.String,
  userId: Schema.String,
});
export const VaultRow = Schema.Struct({
  paidOut: Schema.Boolean,
  totalEarnings: Schema.String,
  userId: Schema.String,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.NullOr(Schema.String),
});
export const MutationSuccess = Schema.Struct({ success: Schema.Boolean });

export class VaultUnauthorized extends Schema.TaggedErrorClass<VaultUnauthorized>()(
  "VaultUnauthorized",
  { message: Schema.String }
) {}
export class VaultForbidden extends Schema.TaggedErrorClass<VaultForbidden>()(
  "VaultForbidden",
  { message: Schema.String }
) {}
export class VaultBadRequest extends Schema.TaggedErrorClass<VaultBadRequest>()(
  "VaultBadRequest",
  { message: Schema.String }
) {}
export class VaultNotFound extends Schema.TaggedErrorClass<VaultNotFound>()(
  "VaultNotFound",
  { message: Schema.String }
) {}
export class VaultPersistenceUnavailable extends Schema.TaggedErrorClass<VaultPersistenceUnavailable>()(
  "VaultPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String }
) {}

export const VaultError = Schema.Union([
  VaultUnauthorized.pipe(HttpApiSchema.status(401)),
  VaultForbidden.pipe(HttpApiSchema.status(403)),
  VaultBadRequest.pipe(HttpApiSchema.status(400)),
  VaultNotFound.pipe(HttpApiSchema.status(404)),
  VaultPersistenceUnavailable.pipe(HttpApiSchema.status(500)),
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
  .prefix("/vault");

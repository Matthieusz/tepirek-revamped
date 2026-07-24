/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { EventIdSchema, HeroIdSchema } from "../../domain/core-identifiers.ts";
import { AppUserIdSchema } from "../../domain/squad-builder/app-user-id.ts";
import { SessionMiddleware } from "../auth/http-api-middleware.ts";

export { EventIdSchema, HeroIdSchema };

const PositiveNumber = Schema.Finite.check(Schema.isGreaterThan(0));
const VaultMetric = Schema.Finite;
export const DistributeGoldPayload = Schema.Struct({
  goldAmount: PositiveNumber,
  heroId: HeroIdSchema,
});
export interface DistributeGoldPayload extends Schema.Schema.Type<
  typeof DistributeGoldPayload
> {}
export const EventFilterPayload = Schema.Struct({
  eventId: Schema.optionalKey(EventIdSchema),
});
export interface EventFilterPayload extends Schema.Schema.Type<
  typeof EventFilterPayload
> {}
export const TogglePaidOutPayload = Schema.Struct({
  eventId: EventIdSchema,
  paidOut: Schema.Boolean,
  userId: AppUserIdSchema,
});
export interface TogglePaidOutPayload extends Schema.Schema.Type<
  typeof TogglePaidOutPayload
> {}
export const DistributeGoldSuccess = Schema.Struct({
  goldAmount: PositiveNumber,
  heroId: HeroIdSchema,
  heroName: Schema.String,
  pointWorth: VaultMetric,
  success: Schema.Boolean,
  totalPoints: VaultMetric,
  usersUpdated: VaultMetric,
});
export interface DistributeGoldSuccess extends Schema.Schema.Type<
  typeof DistributeGoldSuccess
> {}
export const VaultRow = Schema.Struct({
  paidOut: Schema.Boolean,
  totalEarnings: Schema.String,
  userId: AppUserIdSchema,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.NullOr(Schema.String),
});
export interface VaultRow extends Schema.Schema.Type<typeof VaultRow> {}
export const MutationSuccess = Schema.Struct({ success: Schema.Boolean });
export interface MutationSuccess extends Schema.Schema.Type<
  typeof MutationSuccess
> {}

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

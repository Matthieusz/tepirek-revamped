/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import {
  AUCTION_PROFESSIONS,
  AUCTION_TYPES,
  isLegalAuctionSlot,
} from "@tepirek-revamped/config";
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import * as Schema from "effect/Schema";

import { AuctionSignupId } from "../../domain/core-identifiers.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";

export { AuctionSignupId } from "../../domain/core-identifiers.ts";

const PositiveInt = Schema.Finite.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);

export const AuctionProfessionSchema = Schema.Literals(AUCTION_PROFESSIONS);

export const AuctionTypeSchema = Schema.Literals(AUCTION_TYPES);

export const AuctionGroupPayload = Schema.Struct({
  profession: AuctionProfessionSchema,
  type: AuctionTypeSchema,
});

export interface AuctionGroupPayload extends Schema.Schema.Type<
  typeof AuctionGroupPayload
> {}

const AuctionSignupPayloadFields = Schema.Struct({
  column: PositiveInt,
  level: PositiveInt,
  profession: AuctionProfessionSchema,
  round: PositiveInt,
  type: AuctionTypeSchema,
});

export const AuctionSignupPayload = AuctionSignupPayloadFields.pipe(
  Schema.refine(
    (value): value is typeof AuctionSignupPayloadFields.Type =>
      isLegalAuctionSlot(value),
    { message: "Nieprawidłowe pole licytacji" }
  )
);

export const RemoveAuctionSignupPayload = Schema.Struct({
  id: AuctionSignupId,
});

export interface RemoveAuctionSignupPayload extends Schema.Schema.Type<
  typeof RemoveAuctionSignupPayload
> {}

export const AuctionSignupSummary = Schema.Struct({
  column: PositiveInt,
  createdAt: Schema.DateFromString,
  id: AuctionSignupId,
  level: PositiveInt,
  round: PositiveInt,
  userId: AppUserId,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.NullOr(Schema.String),
});

export interface AuctionSignupSummary extends Schema.Schema.Type<
  typeof AuctionSignupSummary
> {}

export const AuctionStats = Schema.Struct({
  totalSignups: Schema.Finite,
  uniqueUsers: Schema.Finite,
});

export interface AuctionStats extends Schema.Schema.Type<typeof AuctionStats> {}

export const ToggleAuctionSignupSuccess = Schema.Struct({
  action: Schema.Literals(["added", "removed"]),
});

export interface ToggleAuctionSignupSuccess extends Schema.Schema.Type<
  typeof ToggleAuctionSignupSuccess
> {}

export const RemoveAuctionSignupSuccess = Schema.Struct({
  success: Schema.Literal(true),
});

export interface RemoveAuctionSignupSuccess extends Schema.Schema.Type<
  typeof RemoveAuctionSignupSuccess
> {}

export const ClearAuctionSignupsSuccess = Schema.Struct({
  success: Schema.Literal(true),
});

export interface ClearAuctionSignupsSuccess extends Schema.Schema.Type<
  typeof ClearAuctionSignupsSuccess
> {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AuctionUnauthorized extends Schema.TaggedError<AuctionUnauthorized>()(
  "AuctionUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AuctionForbidden extends Schema.TaggedError<AuctionForbidden>()(
  "AuctionForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AuctionNotFound extends Schema.TaggedError<AuctionNotFound>()(
  "AuctionNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AuctionConflict extends Schema.TaggedError<AuctionConflict>()(
  "AuctionConflict",
  { message: Schema.String },
  { httpApiStatus: 409 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class AuctionPersistenceUnavailable extends Schema.TaggedError<AuctionPersistenceUnavailable>()(
  "AuctionPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 500 }
) {}

export const AuctionError = Schema.Union([
  AuctionUnauthorized,
  AuctionForbidden,
  AuctionNotFound,
  AuctionConflict,
  AuctionPersistenceUnavailable,
]);

export const AuctionHttpApiGroup = HttpApiGroup.make("auction")
  .add(
    HttpApiEndpoint.post("getAuctionSignups", "/signups", {
      error: AuctionError,
      payload: AuctionGroupPayload,
      success: Schema.Array(AuctionSignupSummary),
    }),
    HttpApiEndpoint.post("getAuctionStats", "/stats", {
      error: AuctionError,
      payload: AuctionGroupPayload,
      success: AuctionStats,
    }),
    HttpApiEndpoint.post("removeAuctionSignup", "/signups/remove", {
      error: AuctionError,
      payload: RemoveAuctionSignupPayload,
      success: RemoveAuctionSignupSuccess,
    }),
    HttpApiEndpoint.post("clearAuctionSignups", "/signups/clear", {
      error: AuctionError,
      payload: AuctionGroupPayload,
      success: ClearAuctionSignupsSuccess,
    }),
    HttpApiEndpoint.post("toggleAuctionSignup", "/signups/toggle", {
      error: AuctionError,
      payload: AuctionSignupPayload,
      success: ToggleAuctionSignupSuccess,
    })
  )
  .prefix("/auction");

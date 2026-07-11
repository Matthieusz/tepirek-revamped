/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import {
  AUCTION_PROFESSIONS,
  AUCTION_TYPES,
  isLegalAuctionSlot,
} from "@tepirek-revamped/config";
import type { AuctionProfession, AuctionType } from "@tepirek-revamped/config";
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { SessionMiddleware } from "../auth/http-api-middleware.js";

const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);
export const AuctionProfessionSchema = Schema.Literals(AUCTION_PROFESSIONS);
export const AuctionTypeSchema = Schema.Literals(AUCTION_TYPES);
export const AuctionSignupIdSchema = PositiveInt.annotate({
  identifier: "AuctionSignupId",
});

export const AuctionGroupPayload = Schema.Struct({
  profession: AuctionProfessionSchema,
  type: AuctionTypeSchema,
});
export interface AuctionSignupPayloadType {
  readonly column: number;
  readonly level: number;
  readonly profession: AuctionProfession;
  readonly round: number;
  readonly type: AuctionType;
}

export const AuctionSignupPayload = Schema.Struct({
  column: PositiveInt,
  level: PositiveInt,
  profession: AuctionProfessionSchema,
  round: PositiveInt,
  type: AuctionTypeSchema,
}).pipe(
  Schema.refine(
    (value): value is AuctionSignupPayloadType => isLegalAuctionSlot(value),
    { message: "Nieprawidłowe pole licytacji" }
  )
);
export const RemoveAuctionSignupPayload = Schema.Struct({
  id: AuctionSignupIdSchema,
});

export const AuctionSignupSummary = Schema.Struct({
  column: PositiveInt,
  createdAt: Schema.DateFromString,
  id: AuctionSignupIdSchema,
  level: PositiveInt,
  round: PositiveInt,
  userId: Schema.String,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.NullOr(Schema.String),
});
export const AuctionStats = Schema.Struct({
  totalSignups: Schema.Number,
  uniqueUsers: Schema.Number,
});
export const ToggleAuctionSignupSuccess = Schema.Struct({
  action: Schema.Literals(["added", "removed"]),
});
export const RemoveAuctionSignupSuccess = Schema.Struct({
  success: Schema.Literal(true),
});

export class AuctionUnauthorized extends Schema.TaggedErrorClass<AuctionUnauthorized>()(
  "AuctionUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}
export class AuctionForbidden extends Schema.TaggedErrorClass<AuctionForbidden>()(
  "AuctionForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}
export class AuctionNotFound extends Schema.TaggedErrorClass<AuctionNotFound>()(
  "AuctionNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}
export class AuctionConflict extends Schema.TaggedErrorClass<AuctionConflict>()(
  "AuctionConflict",
  { message: Schema.String },
  { httpApiStatus: 409 }
) {}
export class AuctionPersistenceUnavailable extends Schema.TaggedErrorClass<AuctionPersistenceUnavailable>()(
  "AuctionPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String },
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
    HttpApiEndpoint.post("toggleAuctionSignup", "/signups/toggle", {
      error: AuctionError,
      payload: AuctionSignupPayload,
      success: ToggleAuctionSignupSuccess,
    })
  )
  .middleware(SessionMiddleware)
  .prefix("/auction");

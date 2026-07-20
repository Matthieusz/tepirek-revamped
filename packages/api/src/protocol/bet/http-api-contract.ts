/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
  BetIdSchema,
  EventIdSchema,
  HeroIdSchema,
} from "../../domain/core-identifiers.ts";
import { AppUserIdSchema } from "../../domain/squad-builder/app-user-id.ts";
import { SessionMiddleware } from "../auth/http-api-middleware.ts";

export { BetIdSchema, EventIdSchema, HeroIdSchema };

const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);

const UserId = AppUserIdSchema;

export const CreateBetPayload = Schema.Struct({
  heroId: HeroIdSchema,
  userIds: Schema.NonEmptyArray(UserId),
});
export interface CreateBetPayload extends Schema.Schema.Type<
  typeof CreateBetPayload
> {}
export const DeleteBetPayload = Schema.Struct({ id: BetIdSchema });
export interface DeleteBetPayload extends Schema.Schema.Type<
  typeof DeleteBetPayload
> {}
export const EditBetPayload = Schema.Struct({
  betId: BetIdSchema,
  newUserIds: Schema.NonEmptyArray(UserId),
});
export interface EditBetPayload extends Schema.Schema.Type<
  typeof EditBetPayload
> {}
export const GetAllPaginatedBetsPayload = Schema.Struct({
  eventId: Schema.optionalKey(EventIdSchema),
  heroId: Schema.optionalKey(HeroIdSchema),
  limit: Schema.optionalKey(PositiveInt.check(Schema.isLessThanOrEqualTo(50))),
  page: Schema.optionalKey(PositiveInt),
});
export interface GetAllPaginatedBetsPayload extends Schema.Schema.Type<
  typeof GetAllPaginatedBetsPayload
> {}
export const GetBetMembersPayload = Schema.Struct({ betId: BetIdSchema });
export interface GetBetMembersPayload extends Schema.Schema.Type<
  typeof GetBetMembersPayload
> {}
export const GetBetsByEventPayload = Schema.Struct({ eventId: EventIdSchema });
export interface GetBetsByEventPayload extends Schema.Schema.Type<
  typeof GetBetsByEventPayload
> {}

export const BetMemberSummary = Schema.Struct({
  heroBetId: BetIdSchema,
  points: Schema.String,
  userId: AppUserIdSchema,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.NullOr(Schema.String),
});
export interface BetMemberSummary extends Schema.Schema.Type<
  typeof BetMemberSummary
> {}
export const BetSummary = Schema.Struct({
  createdAt: Schema.DateFromString,
  createdBy: AppUserIdSchema,
  createdByImage: Schema.NullOr(Schema.String),
  createdByName: Schema.NullOr(Schema.String),
  eventId: EventIdSchema,
  heroId: HeroIdSchema,
  heroImage: Schema.NullOr(Schema.String),
  heroLevel: Schema.optionalKey(Schema.Number),
  heroName: Schema.String,
  id: BetIdSchema,
  memberCount: PositiveInt,
  members: Schema.Array(BetMemberSummary),
});
export interface BetSummary extends Schema.Schema.Type<typeof BetSummary> {}
export const BetByEventSummary = Schema.Struct({
  createdAt: Schema.DateFromString,
  createdBy: AppUserIdSchema,
  eventId: EventIdSchema,
  heroId: HeroIdSchema,
  heroName: Schema.String,
  id: BetIdSchema,
  memberCount: PositiveInt,
});
export interface BetByEventSummary extends Schema.Schema.Type<
  typeof BetByEventSummary
> {}
export const StoredBetMember = Schema.Struct({
  id: PositiveInt,
  points: Schema.String,
  userId: AppUserIdSchema,
});
export interface StoredBetMember extends Schema.Schema.Type<
  typeof StoredBetMember
> {}
export const CreatedBet = Schema.Struct({
  createdAt: Schema.DateFromString,
  createdBy: UserId,
  heroId: HeroIdSchema,
  id: BetIdSchema,
  memberCount: PositiveInt,
});
export interface CreatedBet extends Schema.Schema.Type<typeof CreatedBet> {}
export const LatestBetForCopy = Schema.NullOr(
  Schema.Struct({
    id: BetIdSchema,
    members: Schema.Array(BetMemberSummary),
  })
);
export const PaginatedBets = Schema.Struct({
  items: Schema.Array(BetSummary),
  pagination: Schema.Struct({
    hasMore: Schema.Boolean,
    limit: PositiveInt,
    page: PositiveInt,
    totalItems: Schema.Number,
    totalPages: Schema.Number,
  }),
});
export interface PaginatedBets extends Schema.Schema.Type<
  typeof PaginatedBets
> {}
export const MutationSuccess = Schema.Struct({ success: Schema.Boolean });
export interface MutationSuccess extends Schema.Schema.Type<
  typeof MutationSuccess
> {}

export class BetUnauthorized extends Schema.TaggedErrorClass<BetUnauthorized>()(
  "BetUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}
export class BetForbidden extends Schema.TaggedErrorClass<BetForbidden>()(
  "BetForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}
export class BetBadRequest extends Schema.TaggedErrorClass<BetBadRequest>()(
  "BetBadRequest",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}
export class BetNotFound extends Schema.TaggedErrorClass<BetNotFound>()(
  "BetNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}
export class BetPersistenceUnavailable extends Schema.TaggedErrorClass<BetPersistenceUnavailable>()(
  "BetPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 500 }
) {}

export const BetError = Schema.Union([
  BetUnauthorized,
  BetForbidden,
  BetBadRequest,
  BetNotFound,
  BetPersistenceUnavailable,
]);

export const BetHttpApiGroup = HttpApiGroup.make("bet")
  .add(
    HttpApiEndpoint.post("create", "/", {
      error: BetError,
      payload: CreateBetPayload,
      success: CreatedBet,
    }),
    HttpApiEndpoint.post("delete", "/delete", {
      error: BetError,
      payload: DeleteBetPayload,
      success: MutationSuccess,
    }),
    HttpApiEndpoint.post("edit", "/edit", {
      error: BetError,
      payload: EditBetPayload,
      success: MutationSuccess,
    }),
    HttpApiEndpoint.get("getAll", "/", {
      error: BetError,
      success: Schema.Array(BetSummary),
    }),
    HttpApiEndpoint.post("getAllPaginated", "/paginated", {
      error: BetError,
      payload: GetAllPaginatedBetsPayload,
      success: PaginatedBets,
    }),
    HttpApiEndpoint.post("getBetMembers", "/members", {
      error: BetError,
      payload: GetBetMembersPayload,
      success: Schema.Array(StoredBetMember),
    }),
    HttpApiEndpoint.post("getByEvent", "/by-event", {
      error: BetError,
      payload: GetBetsByEventPayload,
      success: Schema.Array(BetByEventSummary),
    }),
    HttpApiEndpoint.get("getLatestForCopy", "/latest-for-copy", {
      error: BetError,
      success: LatestBetForCopy,
    })
  )
  .middleware(SessionMiddleware)
  .prefix("/bet");

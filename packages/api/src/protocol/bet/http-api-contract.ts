/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);

const UserId = Schema.NonEmptyString;
const OptionalPositiveInt = Schema.optional(PositiveInt);

export const CreateBetPayload = Schema.Struct({
  heroId: PositiveInt,
  userIds: Schema.NonEmptyArray(UserId),
});
export const DeleteBetPayload = Schema.Struct({ id: PositiveInt });
export const EditBetPayload = Schema.Struct({
  betId: PositiveInt,
  newUserIds: Schema.NonEmptyArray(UserId),
});
export const GetAllPaginatedBetsPayload = Schema.Struct({
  eventId: OptionalPositiveInt,
  heroId: OptionalPositiveInt,
  limit: Schema.optional(PositiveInt.check(Schema.isLessThanOrEqualTo(50))),
  page: Schema.optional(PositiveInt),
});
export const GetBetMembersPayload = Schema.Struct({ betId: PositiveInt });
export const GetBetsByEventPayload = Schema.Struct({ eventId: PositiveInt });

export const BetMemberSummary = Schema.Struct({
  heroBetId: PositiveInt,
  points: Schema.String,
  userId: Schema.String,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.NullOr(Schema.String),
});
export const BetSummary = Schema.Struct({
  createdAt: Schema.Date,
  createdBy: Schema.String,
  createdByImage: Schema.NullOr(Schema.String),
  createdByName: Schema.NullOr(Schema.String),
  eventId: PositiveInt,
  heroId: PositiveInt,
  heroImage: Schema.NullOr(Schema.String),
  heroLevel: Schema.optional(Schema.Number),
  heroName: Schema.String,
  id: PositiveInt,
  memberCount: PositiveInt,
  members: Schema.Array(BetMemberSummary),
});
export const BetByEventSummary = Schema.Struct({
  createdAt: Schema.Date,
  createdBy: Schema.String,
  eventId: PositiveInt,
  heroId: PositiveInt,
  heroName: Schema.String,
  id: PositiveInt,
  memberCount: PositiveInt,
});
export const StoredBetMember = Schema.Struct({
  id: PositiveInt,
  points: Schema.String,
  userId: Schema.String,
});
export const CreatedBet = Schema.Struct({
  createdAt: Schema.Date,
  createdBy: UserId,
  heroId: PositiveInt,
  id: PositiveInt,
  memberCount: PositiveInt,
});
export const LatestBetForCopy = Schema.NullOr(
  Schema.Struct({
    id: PositiveInt,
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
export const MutationSuccess = Schema.Struct({ success: Schema.Boolean });

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
  { cause: Schema.Defect(), operation: Schema.String },
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
  .prefix("/bet");

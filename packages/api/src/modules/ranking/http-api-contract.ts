/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);
const OptionalPositiveInt = Schema.optional(PositiveInt);

export const HeroIdPayload = Schema.Struct({ heroId: PositiveInt });
export const RankingPayload = Schema.Struct({
  eventId: OptionalPositiveInt,
  heroId: OptionalPositiveInt,
});
export const HeroStats = Schema.Struct({
  currentPointWorth: Schema.Number,
  heroId: PositiveInt,
  heroName: Schema.String,
  totalBets: Schema.Number,
  totalPoints: Schema.Number,
});
export const RankingRow = Schema.Struct({
  totalBets: Schema.Number,
  totalEarnings: Schema.String,
  totalPoints: Schema.String,
  userId: Schema.String,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.NullOr(Schema.String),
});
export const RankingResult = Schema.Struct({
  pointWorth: Schema.NullOr(Schema.Number),
  ranking: Schema.Array(RankingRow),
  totalBets: Schema.Number,
});

export class RankingUnauthorized extends Schema.TaggedErrorClass<RankingUnauthorized>()(
  "RankingUnauthorized",
  { message: Schema.String }
) {}
export class RankingForbidden extends Schema.TaggedErrorClass<RankingForbidden>()(
  "RankingForbidden",
  { message: Schema.String }
) {}
export class RankingNotFound extends Schema.TaggedErrorClass<RankingNotFound>()(
  "RankingNotFound",
  { message: Schema.String }
) {}
export class RankingPersistenceUnavailable extends Schema.TaggedErrorClass<RankingPersistenceUnavailable>()(
  "RankingPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String }
) {}

export const RankingError = Schema.Union([
  RankingUnauthorized.pipe(HttpApiSchema.status(401)),
  RankingForbidden.pipe(HttpApiSchema.status(403)),
  RankingNotFound.pipe(HttpApiSchema.status(404)),
  RankingPersistenceUnavailable.pipe(HttpApiSchema.status(500)),
]);

export const RankingHttpApiGroup = HttpApiGroup.make("ranking")
  .add(
    HttpApiEndpoint.post("getHeroStats", "/hero-stats", {
      error: RankingError,
      payload: HeroIdPayload,
      success: HeroStats,
    }),
    HttpApiEndpoint.get("getOldestUnpaidEvent", "/oldest-unpaid-event", {
      error: RankingError,
      success: Schema.NullOr(PositiveInt),
    }),
    HttpApiEndpoint.post("getRanking", "/", {
      error: RankingError,
      payload: RankingPayload,
      success: RankingResult,
    })
  )
  .prefix("/ranking");

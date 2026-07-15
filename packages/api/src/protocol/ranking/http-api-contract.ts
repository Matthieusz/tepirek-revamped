/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { EventIdSchema, HeroIdSchema } from "../../domain/core-identifiers.ts";
import { AppUserIdSchema } from "../../domain/squad-builder/app-user-id.ts";
import { SessionMiddleware } from "../auth/http-api-middleware.ts";

export { EventIdSchema, HeroIdSchema };

export const HeroIdPayload = Schema.Struct({ heroId: HeroIdSchema });
export const RankingPayload = Schema.Struct({
  eventId: Schema.optional(EventIdSchema),
  heroId: Schema.optional(HeroIdSchema),
});
export const HeroStats = Schema.Struct({
  currentPointWorth: Schema.Number,
  heroId: HeroIdSchema,
  heroName: Schema.String,
  totalBets: Schema.Number,
  totalPoints: Schema.Number,
});
export const RankingRow = Schema.Struct({
  totalBets: Schema.Number,
  totalEarnings: Schema.String,
  totalPoints: Schema.String,
  userId: AppUserIdSchema,
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
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}
export class RankingForbidden extends Schema.TaggedErrorClass<RankingForbidden>()(
  "RankingForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}
export class RankingNotFound extends Schema.TaggedErrorClass<RankingNotFound>()(
  "RankingNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}
export class RankingPersistenceUnavailable extends Schema.TaggedErrorClass<RankingPersistenceUnavailable>()(
  "RankingPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 500 }
) {}

export const RankingError = Schema.Union([
  RankingUnauthorized,
  RankingForbidden,
  RankingNotFound,
  RankingPersistenceUnavailable,
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
      success: Schema.NullOr(EventIdSchema),
    }),
    HttpApiEndpoint.post("getRanking", "/", {
      error: RankingError,
      payload: RankingPayload,
      success: RankingResult,
    })
  )
  .middleware(SessionMiddleware)
  .prefix("/ranking");

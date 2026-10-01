/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import * as Schema from "effect/Schema";

import { EventId, HeroId } from "../../domain/core-identifiers.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";

export { EventId, HeroId } from "../../domain/core-identifiers.ts";

const RankingMetric = Schema.Finite;

export const HeroIdPayload = Schema.Struct({ heroId: HeroId });

export interface HeroIdPayload extends Schema.Schema.Type<
  typeof HeroIdPayload
> {}

export const RankingPayload = Schema.Struct({
  eventId: Schema.optionalKey(EventId),
  heroId: Schema.optionalKey(HeroId),
});

export interface RankingPayload extends Schema.Schema.Type<
  typeof RankingPayload
> {}

export const HeroStats = Schema.Struct({
  currentPointWorth: RankingMetric,
  heroId: HeroId,
  heroName: Schema.String,
  totalBets: RankingMetric,
  totalPoints: RankingMetric,
});

export interface HeroStats extends Schema.Schema.Type<typeof HeroStats> {}

export const RankingRow = Schema.Struct({
  totalBets: RankingMetric,
  totalEarnings: Schema.String,
  totalPoints: Schema.String,
  userId: AppUserId,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.NullOr(Schema.String),
});

export interface RankingRow extends Schema.Schema.Type<typeof RankingRow> {}

export const RankingResult = Schema.Struct({
  pointWorth: Schema.NullOr(RankingMetric),
  ranking: Schema.Array(RankingRow),
  totalBets: RankingMetric,
});

export interface RankingResult extends Schema.Schema.Type<
  typeof RankingResult
> {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class RankingUnauthorized extends Schema.TaggedError<RankingUnauthorized>()(
  "RankingUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class RankingForbidden extends Schema.TaggedError<RankingForbidden>()(
  "RankingForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class RankingNotFound extends Schema.TaggedError<RankingNotFound>()(
  "RankingNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class RankingPersistenceUnavailable extends Schema.TaggedError<RankingPersistenceUnavailable>()(
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
      success: Schema.NullOr(EventId),
    }),
    HttpApiEndpoint.post("getRanking", "/", {
      error: RankingError,
      payload: RankingPayload,
      success: RankingResult,
    })
  )
  .prefix("/ranking");

import * as Schema from "effect/Schema";

export const RankingSortSchema = Schema.Literals(["points", "bets", "gold"]);
export type RankingSort = typeof RankingSortSchema.Type;

export const RankingSortFiltersSchema = Schema.Struct({
  sortBy: Schema.optional(RankingSortSchema),
});

const RankingSearchSchema = Schema.Struct({
  eventId: Schema.optional(Schema.String),
  heroId: Schema.optional(Schema.String),
  sortBy: Schema.optional(RankingSortSchema),
});

export const searchSchema = (
  search: unknown
): typeof RankingSearchSchema.Type =>
  Schema.decodeUnknownSync(RankingSearchSchema)(search);

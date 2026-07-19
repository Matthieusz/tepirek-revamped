import * as Schema from "effect/Schema";

export const RankingSortSchema = Schema.Literals(["points", "bets", "gold"]);
export type RankingSort = typeof RankingSortSchema.Type;

export const RankingSortFiltersSchema = Schema.Struct({
  sortBy: Schema.optional(RankingSortSchema),
});

/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
import * as Schema from "effect/Schema";

export const RankingSortSchema = Schema.Literals(["points", "bets", "gold"]);
export type RankingSort = typeof RankingSortSchema.Type;

export const RankingSortFiltersSchema = Schema.Struct({
  sortBy: Schema.optional(RankingSortSchema),
});
export interface RankingSortFiltersSchema extends Schema.Schema.Type<
  typeof RankingSortFiltersSchema
> {}

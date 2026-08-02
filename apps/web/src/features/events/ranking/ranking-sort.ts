/* eslint-disable import/namespace -- Effect's namespace imports keep related schema operations grouped. */
import * as Schema from "effect/Schema";

export const RankingSortSchema = Schema.Literals(["points", "bets", "gold"]);
export type RankingSort = typeof RankingSortSchema.Type;

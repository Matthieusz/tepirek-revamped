import * as Schema from "effect/Schema";

import { FilterIdSearchSchema } from "@/lib/event-hero-filter";

const RankingSortSchema = Schema.Literals(["points", "bets", "gold"]);
export type RankingSort = typeof RankingSortSchema.Type;

export const RankingSortFiltersSchema = Schema.Struct({
  sortBy: Schema.optional(RankingSortSchema),
});

const RankingSearchSchema = Schema.Struct({
  eventId: Schema.optional(FilterIdSearchSchema),
  heroId: Schema.optional(FilterIdSearchSchema),
  sortBy: Schema.optional(RankingSortSchema),
});

export const searchSchema = (
  search: unknown
): typeof RankingSearchSchema.Type =>
  Schema.decodeUnknownSync(RankingSearchSchema)(search);

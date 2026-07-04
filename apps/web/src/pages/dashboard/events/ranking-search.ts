import * as Schema from "effect/Schema";

const RankingSearchSchema = Schema.Struct({
  eventId: Schema.optional(Schema.String),
  heroId: Schema.optional(Schema.String),
  sortBy: Schema.optional(Schema.Literals(["points", "bets", "gold"])),
});

export const searchSchema = (
  search: unknown
): typeof RankingSearchSchema.Type =>
  Schema.decodeUnknownSync(RankingSearchSchema)(search);

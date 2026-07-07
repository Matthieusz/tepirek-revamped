/* eslint-disable max-classes-per-file -- Collocated service error schemas. */
import * as Schema from "effect/Schema";

export class RankingNotFound extends Schema.TaggedErrorClass<RankingNotFound>()(
  "RankingNotFound",
  { message: Schema.String }
) {}

export class RankingPersistenceUnavailable extends Schema.TaggedErrorClass<RankingPersistenceUnavailable>()(
  "RankingPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String }
) {}

export type RankingError = RankingNotFound | RankingPersistenceUnavailable;

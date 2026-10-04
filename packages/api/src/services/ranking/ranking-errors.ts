/* eslint-disable max-classes-per-file -- Collocated service error schemas. */
import * as Schema from "effect/Schema";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class RankingNotFound extends Schema.TaggedError<RankingNotFound>()(
  "RankingNotFound",
  { message: Schema.String }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class RankingPersistenceUnavailable extends Schema.TaggedError<RankingPersistenceUnavailable>()(
  "RankingPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String }
) {}

export type RankingError = RankingNotFound | RankingPersistenceUnavailable;

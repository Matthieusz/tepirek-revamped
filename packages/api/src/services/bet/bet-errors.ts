/* eslint-disable max-classes-per-file -- Collocated service error schemas. */
import * as Schema from "effect/Schema";

export class BetBadRequest extends Schema.TaggedErrorClass<BetBadRequest>()(
  "BetBadRequest",
  { message: Schema.String }
) {}

export class BetNotFound extends Schema.TaggedErrorClass<BetNotFound>()(
  "BetNotFound",
  { message: Schema.String }
) {}

export class BetPersistenceUnavailable extends Schema.TaggedErrorClass<BetPersistenceUnavailable>()(
  "BetPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String }
) {}

export type BetError = BetBadRequest | BetNotFound | BetPersistenceUnavailable;

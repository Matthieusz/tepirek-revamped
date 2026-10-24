/* eslint-disable max-classes-per-file -- Collocated service error schemas. */
import * as Schema from "effect/Schema";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class BetBadRequest extends Schema.TaggedError<
  BetBadRequest,
  { readonly brand: unique symbol }
>()("BetBadRequest", { message: Schema.String }) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class BetNotFound extends Schema.TaggedError<
  BetNotFound,
  { readonly brand: unique symbol }
>()("BetNotFound", { message: Schema.String }) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class BetPersistenceUnavailable extends Schema.TaggedError<
  BetPersistenceUnavailable,
  { readonly brand: unique symbol }
>()("BetPersistenceUnavailable", {
  cause: Schema.Defect(),
  operation: Schema.String,
}) {}

export type BetError = BetBadRequest | BetNotFound | BetPersistenceUnavailable;

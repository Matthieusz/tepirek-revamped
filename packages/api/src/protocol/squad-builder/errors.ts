/* eslint-disable max-classes-per-file -- Shared squad-builder error classes are defined centrally for reuse across protocol groups. */
import * as Schema from "effect/Schema";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderUnauthorized extends Schema.TaggedError<
  SquadBuilderUnauthorized,
  { readonly brand: unique symbol }
>()(
  "SquadBuilderUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderForbidden extends Schema.TaggedError<
  SquadBuilderForbidden,
  { readonly brand: unique symbol }
>()(
  "SquadBuilderForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderNotFound extends Schema.TaggedError<
  SquadBuilderNotFound,
  { readonly brand: unique symbol }
>()(
  "SquadBuilderNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderConflict extends Schema.TaggedError<
  SquadBuilderConflict,
  { readonly brand: unique symbol }
>()(
  "SquadBuilderConflict",
  { message: Schema.String },
  { httpApiStatus: 409 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderInvalidInput extends Schema.TaggedError<
  SquadBuilderInvalidInput,
  { readonly brand: unique symbol }
>()(
  "SquadBuilderInvalidInput",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderUpstreamUnavailable extends Schema.TaggedError<
  SquadBuilderUpstreamUnavailable,
  { readonly brand: unique symbol }
>()(
  "SquadBuilderUpstreamUnavailable",
  { message: Schema.String },
  { httpApiStatus: 502 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderRateLimited extends Schema.TaggedError<
  SquadBuilderRateLimited,
  { readonly brand: unique symbol }
>()(
  "SquadBuilderRateLimited",
  { message: Schema.String },
  { httpApiStatus: 429 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderPersistenceUnavailable extends Schema.TaggedError<
  SquadBuilderPersistenceUnavailable,
  { readonly brand: unique symbol }
>()(
  "SquadBuilderPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 503 }
) {}

/* eslint-disable max-classes-per-file -- Shared squad-builder error classes are defined centrally for reuse across protocol groups. */
import * as Schema from "effect/Schema";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderUnauthorized extends Schema.TaggedError<SquadBuilderUnauthorized>()(
  "SquadBuilderUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderForbidden extends Schema.TaggedError<SquadBuilderForbidden>()(
  "SquadBuilderForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderNotFound extends Schema.TaggedError<SquadBuilderNotFound>()(
  "SquadBuilderNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderConflict extends Schema.TaggedError<SquadBuilderConflict>()(
  "SquadBuilderConflict",
  { message: Schema.String },
  { httpApiStatus: 409 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderInvalidInput extends Schema.TaggedError<SquadBuilderInvalidInput>()(
  "SquadBuilderInvalidInput",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderUpstreamUnavailable extends Schema.TaggedError<SquadBuilderUpstreamUnavailable>()(
  "SquadBuilderUpstreamUnavailable",
  { message: Schema.String },
  { httpApiStatus: 502 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderRateLimited extends Schema.TaggedError<SquadBuilderRateLimited>()(
  "SquadBuilderRateLimited",
  { message: Schema.String },
  { httpApiStatus: 429 }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class SquadBuilderPersistenceUnavailable extends Schema.TaggedError<SquadBuilderPersistenceUnavailable>()(
  "SquadBuilderPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 503 }
) {}

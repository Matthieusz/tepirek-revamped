/* eslint-disable max-classes-per-file -- Shared squad-builder error classes are defined centrally for reuse across protocol groups. */
import * as Schema from "effect/Schema";

export class SquadBuilderUnauthorized extends Schema.TaggedErrorClass<SquadBuilderUnauthorized>()(
  "SquadBuilderUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

export class SquadBuilderForbidden extends Schema.TaggedErrorClass<SquadBuilderForbidden>()(
  "SquadBuilderForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

export class SquadBuilderNotFound extends Schema.TaggedErrorClass<SquadBuilderNotFound>()(
  "SquadBuilderNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}

export class SquadBuilderConflict extends Schema.TaggedErrorClass<SquadBuilderConflict>()(
  "SquadBuilderConflict",
  { message: Schema.String },
  { httpApiStatus: 409 }
) {}

export class SquadBuilderInvalidInput extends Schema.TaggedErrorClass<SquadBuilderInvalidInput>()(
  "SquadBuilderInvalidInput",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}

export class SquadBuilderUpstreamUnavailable extends Schema.TaggedErrorClass<SquadBuilderUpstreamUnavailable>()(
  "SquadBuilderUpstreamUnavailable",
  { message: Schema.String },
  { httpApiStatus: 502 }
) {}

export class SquadBuilderPersistenceUnavailable extends Schema.TaggedErrorClass<SquadBuilderPersistenceUnavailable>()(
  "SquadBuilderPersistenceUnavailable",
  { operation: Schema.String },
  { httpApiStatus: 503 }
) {}

export const SquadBuilderBaseErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const SquadBuilderErrorsWithUpstream = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderUpstreamUnavailable,
  SquadBuilderPersistenceUnavailable,
] as const;

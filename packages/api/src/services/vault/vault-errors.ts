/* eslint-disable max-classes-per-file -- Collocated service error schemas. */
import * as Schema from "effect/Schema";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class VaultBadRequest extends Schema.TaggedError<VaultBadRequest>()(
  "VaultBadRequest",
  { message: Schema.String }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
class VaultNotFound extends Schema.TaggedError<VaultNotFound>()(
  "VaultNotFound",
  { message: Schema.String }
) {}

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class VaultPersistenceUnavailable extends Schema.TaggedError<VaultPersistenceUnavailable>()(
  "VaultPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String }
) {}

export type VaultError =
  | VaultBadRequest
  | VaultNotFound
  | VaultPersistenceUnavailable;

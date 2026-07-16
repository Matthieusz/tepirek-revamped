/* eslint-disable max-classes-per-file -- Collocated service error schemas. */
import * as Schema from "effect/Schema";

export class VaultBadRequest extends Schema.TaggedErrorClass<VaultBadRequest>()(
  "VaultBadRequest",
  { message: Schema.String }
) {}

export class VaultNotFound extends Schema.TaggedErrorClass<VaultNotFound>()(
  "VaultNotFound",
  { message: Schema.String }
) {}

export class VaultPersistenceUnavailable extends Schema.TaggedErrorClass<VaultPersistenceUnavailable>()(
  "VaultPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String }
) {}

export type VaultError =
  | VaultBadRequest
  | VaultNotFound
  | VaultPersistenceUnavailable;

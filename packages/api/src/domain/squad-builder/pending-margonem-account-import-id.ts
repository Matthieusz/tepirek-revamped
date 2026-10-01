import * as Schema from "effect/Schema";

import { buildBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when a pending import id is not a positive integer. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InvalidPendingMargonemAccountImportId extends Schema.TaggedError<InvalidPendingMargonemAccountImportId>()(
  "InvalidPendingMargonemAccountImportId",
  {}
) {}

const brandedPendingMargonemAccountImportId = buildBrandedPositiveInt(
  "PendingMargonemAccountImportId",
  "PendingMargonemAccountImportId.parse",
  () => new InvalidPendingMargonemAccountImportId()
);

/** A validated pending Margonem account import id. */
export const PendingMargonemAccountImportId =
  brandedPendingMargonemAccountImportId.schema;

export type PendingMargonemAccountImportId =
  typeof PendingMargonemAccountImportId.Type;

/** Parse a positive integer as a pending Margonem account import id. */
export const parsePendingMargonemAccountImportId =
  brandedPendingMargonemAccountImportId.parse;

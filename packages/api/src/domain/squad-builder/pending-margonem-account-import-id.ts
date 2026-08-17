import * as Schema from "effect/Schema";

import { makeBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when a pending import id is not a positive integer. */
export class InvalidPendingMargonemAccountImportId extends Schema.TaggedErrorClass<InvalidPendingMargonemAccountImportId>()(
  "InvalidPendingMargonemAccountImportId",
  {}
) {}

const brandedPendingMargonemAccountImportId = makeBrandedPositiveInt(
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

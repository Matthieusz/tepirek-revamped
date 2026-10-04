import * as Schema from "effect/Schema";

import { buildBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when a pending refetch id is not a positive integer. */
// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not an error constructor.
export class InvalidPendingMargonemAccountRefetchId extends Schema.TaggedError<InvalidPendingMargonemAccountRefetchId>()(
  "InvalidPendingMargonemAccountRefetchId",
  {}
) {}

const brandedPendingMargonemAccountRefetchId = buildBrandedPositiveInt(
  "PendingMargonemAccountRefetchId",
  "PendingMargonemAccountRefetchId.parse",
  () => new InvalidPendingMargonemAccountRefetchId()
);

/** A validated pending Margonem account refetch preview id. */
export const PendingMargonemAccountRefetchId =
  brandedPendingMargonemAccountRefetchId.schema;

export type PendingMargonemAccountRefetchId =
  typeof PendingMargonemAccountRefetchId.Type;

/** Parse a positive integer as a pending Margonem account refetch id. */
export const parsePendingMargonemAccountRefetchId =
  brandedPendingMargonemAccountRefetchId.parse;

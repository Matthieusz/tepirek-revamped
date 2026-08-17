import * as Schema from "effect/Schema";

import { makeBrandedPositiveInt } from "./positive-int.ts";

/** Expected failure when a pending refetch id is not a positive integer. */
export class InvalidPendingMargonemAccountRefetchId extends Schema.TaggedErrorClass<InvalidPendingMargonemAccountRefetchId>()(
  "InvalidPendingMargonemAccountRefetchId",
  {}
) {}

const brandedPendingMargonemAccountRefetchId = makeBrandedPositiveInt(
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

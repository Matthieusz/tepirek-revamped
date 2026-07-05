import { PositiveInt } from "./positive-int.js";
import { isPositiveInteger } from "./prelude.js";
import { err, ok } from "./result.js";
import type { Result } from "./result.js";

/** A validated pending Margonem account refetch preview id. */
export type PendingMargonemAccountRefetchId = number & {
  readonly __brand: "PendingMargonemAccountRefetchId";
};

/** HTTP/API schema for a validated pending account refetch preview id. */
export const PendingMargonemAccountRefetchIdSchema = PositiveInt.annotate({
  identifier: "PendingMargonemAccountRefetchId",
});

/** Expected failure when a pending refetch id is not a positive integer. */
export interface InvalidPendingMargonemAccountRefetchId {
  readonly _tag: "InvalidPendingMargonemAccountRefetchId";
}

/** Parse a positive integer as a pending Margonem account refetch id. */
export const parsePendingMargonemAccountRefetchId = (
  input: number
): Result<
  PendingMargonemAccountRefetchId,
  InvalidPendingMargonemAccountRefetchId
> => {
  if (!isPositiveInteger(input)) {
    return err({ _tag: "InvalidPendingMargonemAccountRefetchId" });
  }

  // SAFETY: isPositiveInteger established the PendingMargonemAccountRefetchId invariant.
  return ok(input as PendingMargonemAccountRefetchId);
};

/** Convert a pending refetch id to its primitive representation. */
export const pendingRefetchIdToNumber = (
  id: PendingMargonemAccountRefetchId
): number => id;

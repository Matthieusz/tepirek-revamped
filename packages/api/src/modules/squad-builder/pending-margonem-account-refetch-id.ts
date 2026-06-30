import { isPositiveInteger } from "./prelude";
import { err, ok } from "./result";
import type { Result } from "./result";

/** A validated pending Margonem account refetch preview id. */
export type PendingMargonemAccountRefetchId = number & {
  readonly __brand: "PendingMargonemAccountRefetchId";
};

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

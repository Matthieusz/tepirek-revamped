import { fail, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";
import { PositiveInt } from "./positive-int.js";
import { isPositiveInteger } from "./prelude.js";

/** A validated pending Margonem account import id. */
export type PendingMargonemAccountImportId = number & {
  readonly __brand: "PendingMargonemAccountImportId";
};

/** HTTP/API schema for a validated pending account import id. */
export const PendingMargonemAccountImportIdSchema = PositiveInt.annotate({
  identifier: "PendingMargonemAccountImportId",
});

/** Expected failure when a pending import id is not a positive integer. */
export interface InvalidPendingMargonemAccountImportId {
  readonly _tag: "InvalidPendingMargonemAccountImportId";
}

/** Parse a positive integer as a pending Margonem account import id. */
export const parsePendingMargonemAccountImportId = (
  input: number
): Outcome<
  PendingMargonemAccountImportId,
  InvalidPendingMargonemAccountImportId
> => {
  if (!isPositiveInteger(input)) {
    return fail({ _tag: "InvalidPendingMargonemAccountImportId" });
  }

  // SAFETY: isPositiveInteger established the PendingMargonemAccountImportId invariant.
  return success(input as PendingMargonemAccountImportId);
};

/** Convert a pending import id to its primitive representation. */
export const pendingImportIdToNumber = (
  id: PendingMargonemAccountImportId
): number => id;

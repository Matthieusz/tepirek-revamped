import { PositiveInt } from "./positive-int.js";
import { isPositiveInteger } from "./prelude.js";
import { err, ok } from "./result.js";
import type { Result } from "./result.js";

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
): Result<
  PendingMargonemAccountImportId,
  InvalidPendingMargonemAccountImportId
> => {
  if (!isPositiveInteger(input)) {
    return err({ _tag: "InvalidPendingMargonemAccountImportId" });
  }

  // SAFETY: isPositiveInteger established the PendingMargonemAccountImportId invariant.
  return ok(input as PendingMargonemAccountImportId);
};

/** Convert a pending import id to its primitive representation. */
export const pendingImportIdToNumber = (
  id: PendingMargonemAccountImportId
): number => id;

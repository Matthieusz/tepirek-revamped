import { isPositiveInteger } from "./prelude.js";
import { err, ok } from "./result.js";
import type { Result } from "./result.js";

/** A persisted Margonem account access row id. */
export type MargonemAccountAccessId = number & {
  readonly __brand: "MargonemAccountAccessId";
};

/** Expected failure when an account access id is not a positive integer. */
export interface InvalidMargonemAccountAccessId {
  readonly _tag: "InvalidMargonemAccountAccessId";
}

/** Parse a positive integer as a Margonem account access id. */
export const parseMargonemAccountAccessId = (
  input: number
): Result<MargonemAccountAccessId, InvalidMargonemAccountAccessId> => {
  if (!isPositiveInteger(input)) {
    return err({ _tag: "InvalidMargonemAccountAccessId" });
  }

  // SAFETY: isPositiveInteger established the MargonemAccountAccessId invariant.
  return ok(input as MargonemAccountAccessId);
};

/** Convert a Margonem account access id to its primitive representation. */
export const margonemAccountAccessIdToNumber = (
  id: MargonemAccountAccessId
): number => id;

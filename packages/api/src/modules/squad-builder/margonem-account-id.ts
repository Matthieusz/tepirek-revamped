import { isPositiveInteger } from "./prelude.js";
import { err, ok } from "./result.js";
import type { Result } from "./result.js";

/** A persisted Margonem account row id. */
export type MargonemAccountId = number & {
  readonly __brand: "MargonemAccountId";
};

/** Expected failure when an account id is not a positive integer. */
export interface InvalidMargonemAccountId {
  readonly _tag: "InvalidMargonemAccountId";
}

/** Parse a positive integer as a Margonem account id. */
export const parseMargonemAccountId = (
  input: number
): Result<MargonemAccountId, InvalidMargonemAccountId> => {
  if (!isPositiveInteger(input)) {
    return err({ _tag: "InvalidMargonemAccountId" });
  }

  // SAFETY: isPositiveInteger established the MargonemAccountId invariant.
  return ok(input as MargonemAccountId);
};

/** Convert a Margonem account id to its primitive representation. */
export const margonemAccountIdToNumber = (id: MargonemAccountId): number => id;

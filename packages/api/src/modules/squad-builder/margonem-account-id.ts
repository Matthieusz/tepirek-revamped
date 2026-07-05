import { fail, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";
import { PositiveInt } from "./positive-int.js";
import { isPositiveInteger } from "./prelude.js";

/** A persisted Margonem account row id. */
export type MargonemAccountId = number & {
  readonly __brand: "MargonemAccountId";
};

/** HTTP/API schema for a persisted Margonem account row id. */
export const MargonemAccountIdSchema = PositiveInt.annotate({
  identifier: "MargonemAccountId",
});

/** Expected failure when an account id is not a positive integer. */
export interface InvalidMargonemAccountId {
  readonly _tag: "InvalidMargonemAccountId";
}

/** Parse a positive integer as a Margonem account id. */
export const parseMargonemAccountId = (
  input: number
): Outcome<MargonemAccountId, InvalidMargonemAccountId> => {
  if (!isPositiveInteger(input)) {
    return fail({ _tag: "InvalidMargonemAccountId" });
  }

  // SAFETY: isPositiveInteger established the MargonemAccountId invariant.
  return success(input as MargonemAccountId);
};

/** Convert a Margonem account id to its primitive representation. */
export const margonemAccountIdToNumber = (id: MargonemAccountId): number => id;

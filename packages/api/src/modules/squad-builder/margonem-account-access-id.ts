import { fail, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";
import { PositiveInt } from "./positive-int.js";
import { isPositiveInteger } from "./prelude.js";

/** A persisted Margonem account access row id. */
export type MargonemAccountAccessId = number & {
  readonly __brand: "MargonemAccountAccessId";
};

/** HTTP/API schema for a persisted Margonem account access row id. */
export const MargonemAccountAccessIdSchema = PositiveInt.annotate({
  identifier: "MargonemAccountAccessId",
});

/** Expected failure when an account access id is not a positive integer. */
export interface InvalidMargonemAccountAccessId {
  readonly _tag: "InvalidMargonemAccountAccessId";
}

/** Parse a positive integer as a Margonem account access id. */
export const parseMargonemAccountAccessId = (
  input: number
): Outcome<MargonemAccountAccessId, InvalidMargonemAccountAccessId> => {
  if (!isPositiveInteger(input)) {
    return fail({ _tag: "InvalidMargonemAccountAccessId" });
  }

  // SAFETY: isPositiveInteger established the MargonemAccountAccessId invariant.
  return success(input as MargonemAccountAccessId);
};

/** Convert a Margonem account access id to its primitive representation. */
export const margonemAccountAccessIdToNumber = (
  id: MargonemAccountAccessId
): number => id;

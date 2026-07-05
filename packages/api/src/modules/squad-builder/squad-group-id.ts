import { fail, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";
import { PositiveInt } from "./positive-int.js";
import { isPositiveInteger } from "./prelude.js";

/** A persisted squad group id. */
export type SquadGroupId = number & { readonly __brand: "SquadGroupId" };

/** HTTP/API schema for a persisted squad group id. */
export const SquadGroupIdSchema = PositiveInt.annotate({
  identifier: "SquadGroupId",
});

/** Expected failure when a squad group id is invalid. */
export interface InvalidSquadGroupId {
  readonly _tag: "InvalidSquadGroupId";
}

/** Parse a positive integer as a squad group id. */
export const parseSquadGroupId = (
  input: number
): Outcome<SquadGroupId, InvalidSquadGroupId> => {
  if (!isPositiveInteger(input)) {
    return fail({ _tag: "InvalidSquadGroupId" });
  }

  // SAFETY: isPositiveInteger established the SquadGroupId invariant.
  return success(input as SquadGroupId);
};

/** Convert a squad group id to its primitive representation. */
export const squadGroupIdToNumber = (id: SquadGroupId): number => id;

import { isPositiveInteger } from "./prelude.js";
import { err, ok } from "./result.js";
import type { Result } from "./result.js";

/** A persisted squad group id. */
export type SquadGroupId = number & { readonly __brand: "SquadGroupId" };

/** Expected failure when a squad group id is invalid. */
export interface InvalidSquadGroupId {
  readonly _tag: "InvalidSquadGroupId";
}

/** Parse a positive integer as a squad group id. */
export const parseSquadGroupId = (
  input: number
): Result<SquadGroupId, InvalidSquadGroupId> => {
  if (!isPositiveInteger(input)) {
    return err({ _tag: "InvalidSquadGroupId" });
  }

  // SAFETY: isPositiveInteger established the SquadGroupId invariant.
  return ok(input as SquadGroupId);
};

/** Convert a squad group id to its primitive representation. */
export const squadGroupIdToNumber = (id: SquadGroupId): number => id;

import { fail, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";
import { isPositiveInteger } from "./prelude.js";

/** A persisted squad id. */
export type SquadId = number & { readonly __brand: "SquadId" };

/** Expected failure when a squad id is invalid. */
export interface InvalidSquadId {
  readonly _tag: "InvalidSquadId";
}

/** Parse a positive integer as a squad id. */
export const parseSquadId = (
  input: number
): Outcome<SquadId, InvalidSquadId> => {
  if (!isPositiveInteger(input)) {
    return fail({ _tag: "InvalidSquadId" });
  }

  // SAFETY: isPositiveInteger established the SquadId invariant.
  return success(input as SquadId);
};

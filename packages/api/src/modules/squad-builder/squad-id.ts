import { isPositiveInteger } from "./prelude";
import { err, ok } from "./result";
import type { Result } from "./result";

/** A persisted squad id. */
export type SquadId = number & { readonly __brand: "SquadId" };

/** Expected failure when a squad id is invalid. */
export interface InvalidSquadId {
  readonly _tag: "InvalidSquadId";
}

/** Parse a positive integer as a squad id. */
export const parseSquadId = (
  input: number
): Result<SquadId, InvalidSquadId> => {
  if (!isPositiveInteger(input)) {
    return err({ _tag: "InvalidSquadId" });
  }

  // SAFETY: isPositiveInteger established the SquadId invariant.
  return ok(input as SquadId);
};

/** Convert a squad id to its primitive representation. */
export const squadIdToNumber = (id: SquadId): number => id;

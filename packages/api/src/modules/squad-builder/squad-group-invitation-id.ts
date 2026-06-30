import { isPositiveInteger } from "./prelude";
import { err, ok } from "./result";
import type { Result } from "./result";

/** A persisted squad group invitation id. */
export type SquadGroupInvitationId = number & {
  readonly __brand: "SquadGroupInvitationId";
};

/** Expected failure when a squad group invitation id is invalid. */
export interface InvalidSquadGroupInvitationId {
  readonly _tag: "InvalidSquadGroupInvitationId";
}

/** Parse a positive integer as a squad group invitation id. */
export const parseSquadGroupInvitationId = (
  input: number
): Result<SquadGroupInvitationId, InvalidSquadGroupInvitationId> => {
  if (!isPositiveInteger(input)) {
    return err({ _tag: "InvalidSquadGroupInvitationId" });
  }

  // SAFETY: isPositiveInteger established the SquadGroupInvitationId invariant.
  return ok(input as SquadGroupInvitationId);
};

/** Convert a squad group invitation id to its primitive representation. */
export const squadGroupInvitationIdToNumber = (
  id: SquadGroupInvitationId
): number => id;

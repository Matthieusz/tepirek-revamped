import { PositiveInt } from "./positive-int.js";
import { isPositiveInteger } from "./prelude.js";
import { err, ok } from "./result.js";
import type { Result } from "./result.js";

/** A persisted squad group invitation id. */
export type SquadGroupInvitationId = number & {
  readonly __brand: "SquadGroupInvitationId";
};

/** HTTP/API schema for a persisted squad group invitation id. */
export const SquadGroupInvitationIdSchema = PositiveInt.annotate({
  identifier: "SquadGroupInvitationId",
});

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

import { fail, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";
import { PositiveInt } from "./positive-int.js";
import { isPositiveInteger } from "./prelude.js";

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
): Outcome<SquadGroupInvitationId, InvalidSquadGroupInvitationId> => {
  if (!isPositiveInteger(input)) {
    return fail({ _tag: "InvalidSquadGroupInvitationId" });
  }

  // SAFETY: isPositiveInteger established the SquadGroupInvitationId invariant.
  return success(input as SquadGroupInvitationId);
};

/** Convert a squad group invitation id to its primitive representation. */
export const squadGroupInvitationIdToNumber = (
  id: SquadGroupInvitationId
): number => id;

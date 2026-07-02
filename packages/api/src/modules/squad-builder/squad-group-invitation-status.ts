import { err, ok } from "./result.js";
import type { Result } from "./result.js";

/** Lifecycle status of a squad group editor invitation. */
export type SquadGroupInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked";

/** Expected failure when a persisted squad group invitation status is unknown. */
export interface InvalidSquadGroupInvitationStatus {
  readonly _tag: "InvalidSquadGroupInvitationStatus";
  readonly value: string;
}

const knownStatuses: readonly SquadGroupInvitationStatus[] = [
  "pending",
  "accepted",
  "declined",
  "revoked",
];

const isKnownStatus = (value: string): value is SquadGroupInvitationStatus =>
  (knownStatuses as readonly string[]).includes(value);

/** Parse a persisted status string into the domain status. */
export const parseSquadGroupInvitationStatus = (
  value: string
): Result<SquadGroupInvitationStatus, InvalidSquadGroupInvitationStatus> => {
  if (!isKnownStatus(value)) {
    return err({ _tag: "InvalidSquadGroupInvitationStatus", value });
  }

  return ok(value);
};

/** Whether an invitation row may move from `from` to `to`. */
export const canTransitionSquadGroupInvitation = (
  from: SquadGroupInvitationStatus,
  to: SquadGroupInvitationStatus
): boolean => {
  if (from === "pending" && (to === "accepted" || to === "declined")) {
    return true;
  }

  if ((from === "pending" || from === "accepted") && to === "revoked") {
    return true;
  }

  if ((from === "declined" || from === "revoked") && to === "pending") {
    return true;
  }

  return false;
};

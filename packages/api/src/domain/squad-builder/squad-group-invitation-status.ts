import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** HTTP/API schema for squad-group editor invitation status. */
export const SquadGroupInvitationStatusSchema = Schema.Literals([
  "pending",
  "accepted",
  "declined",
  "revoked",
]);
/** Lifecycle status of a squad group editor invitation. */
export type SquadGroupInvitationStatus =
  typeof SquadGroupInvitationStatusSchema.Type;

/** HTTP/API schema for invitation statuses that grant editor access. */
export const ActiveSquadGroupInvitationStatusSchema = Schema.Literals([
  "pending",
  "accepted",
]);

/** Expected failure when a persisted squad group invitation status is unknown. */
export class InvalidSquadGroupInvitationStatus extends Schema.TaggedErrorClass<InvalidSquadGroupInvitationStatus>()(
  "InvalidSquadGroupInvitationStatus",
  { value: Schema.String }
) {}

/** Parse a persisted status string into the domain status. */
export const parseSquadGroupInvitationStatus = (
  value: string
): Effect.Effect<
  SquadGroupInvitationStatus,
  InvalidSquadGroupInvitationStatus
> =>
  Schema.decodeUnknownEffect(SquadGroupInvitationStatusSchema)(value).pipe(
    Effect.mapError(() => new InvalidSquadGroupInvitationStatus({ value }))
  );

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

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import {
  ActiveInvitationAccessStatusSchema,
  canTransitionInvitationAccess,
  InvitationAccessStatusSchema,
  parseInvitationAccessStatus,
} from "./invitation-access-lifecycle.ts";

/** HTTP/API schema for squad-group editor invitation status. */
export const SquadGroupInvitationStatusSchema = InvitationAccessStatusSchema;
/** Lifecycle status of a squad group editor invitation. */
export type SquadGroupInvitationStatus =
  typeof SquadGroupInvitationStatusSchema.Type;

/** HTTP/API schema for invitation statuses that grant editor access. */
export const ActiveSquadGroupInvitationStatusSchema =
  ActiveInvitationAccessStatusSchema;

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
  parseInvitationAccessStatus(value).pipe(
    Effect.mapError(() => new InvalidSquadGroupInvitationStatus({ value }))
  );

/** Whether an invitation row may move from `from` to `to`. */
export const canTransitionSquadGroupInvitation = canTransitionInvitationAccess;

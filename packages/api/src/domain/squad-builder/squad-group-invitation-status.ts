import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import {
  InvitationAccessStatusSchema,
  parseInvitationAccessStatus,
} from "./invitation-access-lifecycle.ts";

export {
  ActiveInvitationAccessStatusSchema as ActiveSquadGroupInvitationStatusSchema,
  canTransitionInvitationAccess as canTransitionSquadGroupInvitation,
} from "./invitation-access-lifecycle.ts";

/** HTTP/API schema for squad-group editor invitation status. */
export const SquadGroupInvitationStatusSchema = InvitationAccessStatusSchema;
/** Lifecycle status of a squad group editor invitation. */
export type SquadGroupInvitationStatus =
  typeof SquadGroupInvitationStatusSchema.Type;

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

import type { AppUserId } from "../app-user-id.js";
import type { SquadGroupInvitationId } from "../squad-group-invitation-id.js";

export interface RespondToSquadGroupInvite {
  readonly respond: (input: {
    readonly actorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
    readonly response: "accept" | "decline";
  }) => Promise<void>;
}

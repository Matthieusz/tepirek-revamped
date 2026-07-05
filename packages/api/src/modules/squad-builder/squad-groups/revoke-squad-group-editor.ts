import type { AppUserId } from "../app-user-id.js";
import type { SquadGroupInvitationId } from "../squad-group-invitation-id.js";

export interface RevokeSquadGroupEditor {
  readonly revoke: (input: {
    readonly actorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
  }) => Promise<void>;
}

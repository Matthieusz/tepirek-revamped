import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { SquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.js";

export interface RespondToSquadGroupInvite {
  readonly respond: (input: {
    readonly actorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
    readonly response: "accept" | "decline";
  }) => Promise<void>;
}

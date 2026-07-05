import type { AppUserId } from "../app-user-id.js";
import type { SquadGroupId } from "../squad-group-id.js";

export interface SendSquadGroupEditorInvite {
  readonly send: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly invitedUserId: AppUserId;
  }) => Promise<void>;
}

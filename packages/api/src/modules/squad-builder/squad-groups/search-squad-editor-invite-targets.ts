import type { AppUserId } from "../app-user-id.js";
import type { SquadGroupId } from "../squad-group-id.js";

export interface SearchSquadEditorInviteTargets {
  readonly search: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly query: string;
  }) => Promise<void>;
}

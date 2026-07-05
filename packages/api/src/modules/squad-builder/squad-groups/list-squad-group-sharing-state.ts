import type { AppUserId } from "../app-user-id.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type { SquadGroupListFilters } from "../squad-group-list-filters.js";

export const ListSquadGroupSharingState = {
  countPendingInvites(_input: {
    readonly actorUserId: AppUserId;
  }): Promise<void> {
    return Promise.resolve();
  },

  listEditorGrants(_input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Promise<void> {
    return Promise.resolve();
  },

  listIncomingInvites(_input: {
    readonly actorUserId: AppUserId;
  }): Promise<void> {
    return Promise.resolve();
  },

  listSharedGroups(_input: {
    readonly actorUserId: AppUserId;
    readonly filters?: SquadGroupListFilters;
  }): Promise<void> {
    return Promise.resolve();
  },
};

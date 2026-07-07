import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.js";
import type { SquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.js";

export interface ListSquadGroupSharingState {
  readonly countPendingInvites: (input: {
    readonly actorUserId: AppUserId;
  }) => Promise<void>;

  readonly listEditorGrants: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Promise<void>;

  readonly listIncomingInvites: (input: {
    readonly actorUserId: AppUserId;
  }) => Promise<void>;

  readonly listSharedGroups: (input: {
    readonly actorUserId: AppUserId;
    readonly filters?: SquadGroupListFilters;
  }) => Promise<void>;
}

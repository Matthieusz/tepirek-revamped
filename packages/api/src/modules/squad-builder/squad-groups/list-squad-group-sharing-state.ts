import type { AppUserId } from "../app-user-id.js";
import { fail, isFailure, success } from "../outcome.js";
import type { Outcome } from "../outcome.js";
import type { SquadGroupId } from "../squad-group-id.js";
import { emptySquadGroupListFilters } from "../squad-group-list-filters.js";
import type { SquadGroupListFilters } from "../squad-group-list-filters.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import type {
  SharedSquadGroupSummary,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
  SquadGroupSharingStore,
} from "./squad-group-store.js";

export class ListSquadGroupSharingState {
  private readonly store: SquadGroupSharingStore;

  constructor(store: SquadGroupSharingStore) {
    this.store = store;
  }

  async listIncomingInvites(input: {
    readonly actorUserId: AppUserId;
  }): Promise<
    Outcome<readonly SquadGroupInvitationSummary[], SquadGroupSharingError>
  > {
    const result = await this.store.listIncomingSquadGroupInvites(input);
    if (isFailure(result)) {
      return fail(result.error);
    }
    return success(result.value);
  }

  async listSharedGroups(input: {
    readonly actorUserId: AppUserId;
    readonly filters?: SquadGroupListFilters;
  }): Promise<
    Outcome<readonly SharedSquadGroupSummary[], SquadGroupSharingError>
  > {
    const result = await this.store.listSharedSquadGroups({
      actorUserId: input.actorUserId,
      filters: input.filters ?? emptySquadGroupListFilters,
    });
    if (isFailure(result)) {
      return fail(result.error);
    }
    return success(result.value);
  }

  async listEditorGrants(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Promise<
    Outcome<readonly SquadGroupEditorGrantSummary[], SquadGroupSharingError>
  > {
    const result = await this.store.listSquadGroupEditorGrants(input);
    if (isFailure(result)) {
      return fail(result.error);
    }
    return success(result.value);
  }

  async countPendingInvites(input: {
    readonly actorUserId: AppUserId;
  }): Promise<Outcome<number, SquadGroupSharingError>> {
    const result = await this.store.getPendingSquadGroupInviteCount(input);
    if (isFailure(result)) {
      return fail(result.error);
    }
    return success(result.value);
  }
}

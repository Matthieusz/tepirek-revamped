import type { AppUserId } from "../app-user-id.js";
import { err, isError, ok } from "../result.js";
import type { Result } from "../result.js";
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
    Result<readonly SquadGroupInvitationSummary[], SquadGroupSharingError>
  > {
    const result = await this.store.listIncomingSquadGroupInvites(input);
    if (isError(result)) {
      return err(result.error);
    }
    return ok(result.value);
  }

  async listSharedGroups(input: {
    readonly actorUserId: AppUserId;
    readonly filters?: SquadGroupListFilters;
  }): Promise<
    Result<readonly SharedSquadGroupSummary[], SquadGroupSharingError>
  > {
    const result = await this.store.listSharedSquadGroups({
      actorUserId: input.actorUserId,
      filters: input.filters ?? emptySquadGroupListFilters,
    });
    if (isError(result)) {
      return err(result.error);
    }
    return ok(result.value);
  }

  async listEditorGrants(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Promise<
    Result<readonly SquadGroupEditorGrantSummary[], SquadGroupSharingError>
  > {
    const result = await this.store.listSquadGroupEditorGrants(input);
    if (isError(result)) {
      return err(result.error);
    }
    return ok(result.value);
  }

  async countPendingInvites(input: {
    readonly actorUserId: AppUserId;
  }): Promise<Result<number, SquadGroupSharingError>> {
    const result = await this.store.getPendingSquadGroupInviteCount(input);
    if (isError(result)) {
      return err(result.error);
    }
    return ok(result.value);
  }
}

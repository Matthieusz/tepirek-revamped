import type { AppUserId } from "./app-user-id";
import type { Result } from "./result";
import type {
  GlobalSquadGroupSummary,
  GlobalSquadVisibilityStore,
  SquadBuilderPersistenceUnavailable,
} from "./squad-builder-store";
import {
  emptySquadGroupListFilters,
  squadGroupListFilterPolicy,
} from "./squad-group-list-filters";
import type { SquadGroupListFilters } from "./squad-group-list-filters";

/** Service module for listing globally visible squad groups. */
export class ListGlobalSquadGroups {
  private readonly store: Pick<
    GlobalSquadVisibilityStore,
    "listGlobalSquadGroups"
  >;

  constructor(
    store: Pick<GlobalSquadVisibilityStore, "listGlobalSquadGroups">
  ) {
    this.store = store;
  }

  /** List globally visible squad groups for a verified actor. */
  list(input: {
    readonly actorUserId: AppUserId;
    readonly filters?: SquadGroupListFilters;
  }): Promise<
    Result<
      readonly GlobalSquadGroupSummary[],
      SquadBuilderPersistenceUnavailable
    >
  > {
    return this.store.listGlobalSquadGroups({
      actorUserId: input.actorUserId,
      filters: input.filters ?? emptySquadGroupListFilters,
      limit: squadGroupListFilterPolicy.defaultLimit,
    });
  }
}

import type { Effect } from "effect/Effect";

import type { AppUserId } from "../app-user-id.js";
import {
  emptySquadGroupListFilters,
  squadGroupListFilterPolicy,
} from "../squad-group-list-filters.js";
import type { SquadGroupListFilters } from "../squad-group-list-filters.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import type { GlobalSquadGroupSummary } from "./squad-group-store.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";

/** Service module for listing globally visible squad groups. */
export class ListGlobalSquadGroups {
  private readonly serviceName = "ListGlobalSquadGroups";

  /** List globally visible squad groups for a verified actor. */
  list(input: {
    readonly actorUserId: AppUserId;
    readonly filters?: SquadGroupListFilters;
  }): Effect<
    readonly GlobalSquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    EffectSquadGroupStore
  > {
    void this.serviceName;

    return EffectSquadGroupStore.use((store) =>
      store.listGlobalSquadGroups({
        actorUserId: input.actorUserId,
        filters: input.filters ?? emptySquadGroupListFilters,
        limit: squadGroupListFilterPolicy.defaultLimit,
      })
    );
  }
}

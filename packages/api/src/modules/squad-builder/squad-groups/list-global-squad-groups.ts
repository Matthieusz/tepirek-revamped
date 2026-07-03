import * as Effect from "effect/Effect";

import type { AppUserId } from "../app-user-id.js";
import {
  emptySquadGroupListFilters,
  squadGroupListFilterPolicy,
} from "../squad-group-list-filters.js";
import type { SquadGroupListFilters } from "../squad-group-list-filters.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";

/** Service module for listing globally visible squad groups. */
export class ListGlobalSquadGroups {
  /** List globally visible squad groups for a verified actor. */
  readonly list = Effect.fn("SquadGroups.listGlobal")(
    (input: {
      readonly actorUserId: AppUserId;
      readonly filters?: SquadGroupListFilters;
    }) => 
      EffectSquadGroupStore.use((store) =>
        store.listGlobalSquadGroups({
          actorUserId: input.actorUserId,
          filters: input.filters ?? emptySquadGroupListFilters,
          limit: squadGroupListFilterPolicy.defaultLimit,
        })
      )
    
  );
}

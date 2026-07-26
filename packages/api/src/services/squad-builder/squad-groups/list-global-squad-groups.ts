import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import {
  emptySquadGroupListFilters,
  squadGroupListFilterPolicy,
} from "../../../domain/squad-builder/squad-group-list-filters.ts";
import type { SquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

/** List globally visible squad groups for a verified actor. */
export const list = Effect.fn("SquadGroups.listGlobal")(
  function* listGlobalSquadGroups(input: {
    readonly actorUserId: AppUserId;
    readonly filters?: SquadGroupListFilters;
  }) {
    const store = yield* SquadGroupStoreService;
    return yield* store.listGlobalSquadGroups({
      actorUserId: input.actorUserId,
      filters: input.filters ?? emptySquadGroupListFilters,
      limit: squadGroupListFilterPolicy.defaultLimit,
    });
  }
);

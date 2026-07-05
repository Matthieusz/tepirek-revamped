import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import type { AppUserId } from "../app-user-id.js";
import {
  emptySquadGroupListFilters,
  squadGroupListFilterPolicy,
} from "../squad-group-list-filters.js";
import type { SquadGroupListFilters } from "../squad-group-list-filters.js";
import { SquadGroupStoreService } from "./squad-group-store.js";

/** Service module for listing globally visible squad groups. */
export class ListGlobalSquadGroups {
  /** List globally visible squad groups for a verified actor. */
  readonly list = Effect.fn("SquadGroups.listGlobal")(
    (input: {
      readonly actorUserId: AppUserId;
      readonly filters?: SquadGroupListFilters;
    }) =>
      SquadGroupStoreService.use((store) =>
        store.listGlobalSquadGroups({
          actorUserId: input.actorUserId,
          filters: input.filters ?? emptySquadGroupListFilters,
          limit: squadGroupListFilterPolicy.defaultLimit,
        })
      )
  );
}

export interface Interface {
  readonly list: ListGlobalSquadGroups["list"];
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/ListGlobalSquadGroupsService"
) {}

export const use = serviceUse(Service);

export const layer = Layer.sync(Service, () => {
  const service = new ListGlobalSquadGroups();
  return { list: service.list };
});

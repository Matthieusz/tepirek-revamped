import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import {
  emptySquadGroupListFilters,
  squadGroupListFilterPolicy,
} from "../../../domain/squad-builder/squad-group-list-filters.js";
import type { SquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.js";
import { serviceUse } from "../../../effect/service-use.js";
import { SquadGroupStoreService } from "./squad-group-store.js";
import type { SquadGroupStoreServiceShape } from "./squad-group-store.js";

/** List globally visible squad groups for a verified actor. */
const makeList = (store: SquadGroupStoreServiceShape) =>
  Effect.fn("SquadGroups.listGlobal")(
    (input: {
      readonly actorUserId: AppUserId;
      readonly filters?: SquadGroupListFilters;
    }) =>
      store.listGlobalSquadGroups({
        actorUserId: input.actorUserId,
        filters: input.filters ?? emptySquadGroupListFilters,
        limit: squadGroupListFilterPolicy.defaultLimit,
      })
  );

/** List globally visible squad groups for a verified actor. */
export const list = Effect.fn("SquadGroups.listGlobal")(
  function* listGlobalSquadGroups(input: {
    readonly actorUserId: AppUserId;
    readonly filters?: SquadGroupListFilters;
  }) {
    const store = yield* SquadGroupStoreService;
    return yield* makeList(store)(input);
  }
);

export interface Interface {
  readonly list: ReturnType<typeof makeList>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/ListGlobalSquadGroupsService"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  Effect.gen(function* layer() {
    const store = yield* SquadGroupStoreService;
    return { list: makeList(store) };
  })
);

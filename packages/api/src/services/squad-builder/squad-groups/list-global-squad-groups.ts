import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import {
  emptySquadGroupListFilters,
  squadGroupListFilterPolicy,
} from "../../../domain/squad-builder/squad-group-list-filters.ts";
import type { SquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";
import type { SquadGroupStoreServiceShape } from "./squad-group-store.ts";

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

/** Integration seam that resolves the store from the Effect context. */
export const list = (input: {
  readonly actorUserId: AppUserId;
  readonly filters?: SquadGroupListFilters;
}) => SquadGroupStoreService.use((store) => makeList(store)(input));

export interface ListGlobalSquadGroups {
  readonly list: ReturnType<typeof makeList>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class ListGlobalSquadGroupsService extends Context.Service<
  ListGlobalSquadGroupsService,
  ListGlobalSquadGroups
>()("@tepirek-revamped/api/squad-builder/ListGlobalSquadGroupsService") {}

export const layer = Layer.effect(
  ListGlobalSquadGroupsService,
  Effect.gen(function* layer() {
    const store = yield* SquadGroupStoreService;
    return { list: makeList(store) };
  })
);

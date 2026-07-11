import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import type {
  ActorCannotViewSquadGroup,
  SquadGroupDetail,
  SquadGroupNotFound,
  SquadGroupSummary,
} from "./squad-group-store.js";
import { SquadGroupStoreService } from "./squad-group-store.js";

/** Expected failures returned by listing actor-owned squad groups. */
export type ListMySquadGroupsError = EffectSquadBuilderPersistenceUnavailable;

/** Expected failures returned by loading a squad group visible to the actor. */
export type GetSquadGroupDetailError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | EffectSquadBuilderPersistenceUnavailable;

/** List squad groups owned by the actor. */
export const listMine = Effect.fn("SquadGroups.listMine")(
  (input: { readonly actorUserId: AppUserId }) =>
    SquadGroupStoreService.use((store) => store.listMySquadGroups(input))
);

/** Load a squad group the actor can view. */
export const getMine = Effect.fn("SquadGroups.getMine")(
  (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => SquadGroupStoreService.use((store) => store.getSquadGroupDetail(input))
);

export interface ListSquadGroups {
  readonly listMine: (input: {
    readonly actorUserId: AppUserId;
  }) => Effect.Effect<readonly SquadGroupSummary[], ListMySquadGroupsError>;
  readonly getMine: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Effect.Effect<SquadGroupDetail, GetSquadGroupDetailError>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class ListSquadGroupsService extends Context.Service<
  ListSquadGroupsService,
  ListSquadGroups
>()("@tepirek-revamped/api/squad-builder/ListSquadGroupsService") {}

export const layer = Layer.effect(
  ListSquadGroupsService,
  Effect.gen(function* makeService() {
    const store = yield* SquadGroupStoreService;
    return {
      getMine: (input) =>
        getMine(input).pipe(
          Effect.provideService(SquadGroupStoreService, store)
        ),
      listMine: (input) =>
        listMine(input).pipe(
          Effect.provideService(SquadGroupStoreService, store)
        ),
    };
  })
);

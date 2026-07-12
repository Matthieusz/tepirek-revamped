import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.ts";
import type {
  ActorCannotViewSquadGroup,
  SquadGroupDetail,
  SquadGroupNotFound,
  SquadGroupSummary,
} from "./squad-group-store.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

/** Expected failures returned by listing actor-owned squad groups. */
export type ListMySquadGroupsError = EffectSquadBuilderPersistenceUnavailable;

/** Expected failures returned by loading a squad group visible to the actor. */
export type GetSquadGroupDetailError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | EffectSquadBuilderPersistenceUnavailable;

/** Integration seam that resolves the store from the Effect context. */
export const listMine = (input: { readonly actorUserId: AppUserId }) =>
  SquadGroupStoreService.use((store) => store.listMySquadGroups(input));

/** Integration seam that resolves the store from the Effect context. */
export const getMine = (input: {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}) => SquadGroupStoreService.use((store) => store.getSquadGroupDetail(input));

/** List squad groups owned by the actor. */
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
      getMine: Effect.fn("SquadGroups.getMine")((input) =>
        store.getSquadGroupDetail(input)
      ),
      listMine: Effect.fn("SquadGroups.listMine")((input) =>
        store.listMySquadGroups(input)
      ),
    };
  })
);

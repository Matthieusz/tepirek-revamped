import type { Effect } from "effect/Effect";

import type { AppUserId } from "../app-user-id.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import type {
  ActorCannotViewSquadGroup,
  SquadGroupDetail,
  SquadGroupNotFound,
  SquadGroupSummary,
} from "./squad-group-store.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";

/** Expected failures returned by listing actor-owned squad groups. */
export type ListMySquadGroupsError = EffectSquadBuilderPersistenceUnavailable;

/** Expected failures returned by loading a squad group visible to the actor. */
export type GetSquadGroupDetailError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | EffectSquadBuilderPersistenceUnavailable;

/** Service module for listing and loading squad groups owned by an actor. */
export class ListSquadGroups {
  private readonly serviceName = "ListSquadGroups";

  /** List squad groups owned by the actor. */
  listMine(input: {
    readonly actorUserId: AppUserId;
  }): Effect<
    readonly SquadGroupSummary[],
    ListMySquadGroupsError,
    EffectSquadGroupStore
  > {
    void this.serviceName;

    return EffectSquadGroupStore.use((store) => store.listMySquadGroups(input));
  }

  /** Load a squad group the actor can view. */
  getMine(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorCannotViewSquadGroup
    | EffectSquadBuilderPersistenceUnavailable,
    EffectSquadGroupStore
  > {
    void this.serviceName;

    return EffectSquadGroupStore.use((store) =>
      store.getSquadGroupDetail(input)
    );
  }
}

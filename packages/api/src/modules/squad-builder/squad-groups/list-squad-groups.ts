import type { Effect } from "effect/Effect";

import type { AppUserId } from "../app-user-id";
import type { Result } from "../result";
import type { SquadGroupId } from "../squad-group-id";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors";
import type {
  ActorCannotViewSquadGroup,
  SquadBuilderPersistenceUnavailable,
  SquadGroupDetail,
  SquadGroupNotFound,
  SquadGroupStore,
  SquadGroupSummary,
} from "./squad-group-store";
import { EffectSquadGroupStore } from "./squad-group-store";

/** Expected failures returned by listing actor-owned squad groups. */
export type ListMySquadGroupsError = EffectSquadBuilderPersistenceUnavailable;

/** Service module for listing and loading squad groups owned by an actor. */
export class ListSquadGroups {
  private readonly serviceName = "ListSquadGroups";

  private readonly store:
    | Pick<SquadGroupStore, "listMySquadGroups" | "getSquadGroupDetail">
    | undefined;

  constructor(
    store?: Pick<SquadGroupStore, "listMySquadGroups" | "getSquadGroupDetail">
  ) {
    this.store = store;
  }

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
  }): Promise<
    Result<
      SquadGroupDetail,
      | SquadGroupNotFound
      | ActorCannotViewSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  > {
    if (this.store === undefined) {
      throw new Error("ListSquadGroups.getMine requires a legacy store");
    }

    return this.store.getSquadGroupDetail(input);
  }
}

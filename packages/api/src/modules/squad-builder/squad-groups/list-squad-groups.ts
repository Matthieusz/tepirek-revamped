import type { AppUserId } from "../app-user-id";
import type { Result } from "../result";
import type { SquadGroupId } from "../squad-group-id";
import type {
  ActorCannotViewSquadGroup,
  SquadBuilderPersistenceUnavailable,
  SquadGroupDetail,
  SquadGroupNotFound,
  SquadGroupStore,
  SquadGroupSummary,
} from "./squad-group-store";

/** Service module for listing and loading squad groups owned by an actor. */
export class ListSquadGroups {
  private readonly store: Pick<
    SquadGroupStore,
    "listMySquadGroups" | "getSquadGroupDetail"
  >;

  constructor(
    store: Pick<SquadGroupStore, "listMySquadGroups" | "getSquadGroupDetail">
  ) {
    this.store = store;
  }

  /** List squad groups owned by the actor. */
  listMine(input: {
    readonly actorUserId: AppUserId;
  }): Promise<
    Result<readonly SquadGroupSummary[], SquadBuilderPersistenceUnavailable>
  > {
    return this.store.listMySquadGroups(input);
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
    return this.store.getSquadGroupDetail(input);
  }
}

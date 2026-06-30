import type { AppUserId } from "./app-user-id";
import { err, isError } from "./result";
import type { Result } from "./result";
import type {
  ActorCannotViewSquadGroup,
  SquadBuilderPersistenceUnavailable,
  SquadGroupNotFound,
  SquadGroupStore,
} from "./squad-builder-store";
import type { SquadGroupId } from "./squad-group-id";
import type { AvailableSquadCharacter } from "./squad-group-snapshot";

/** Service module for listing accessible Jaruna characters for a squad group owner. */
export class ListAvailableSquadCharacters {
  private readonly store: Pick<
    SquadGroupStore,
    "getSquadGroupDetail" | "listAvailableCharactersForOwner"
  >;

  constructor(
    store: Pick<
      SquadGroupStore,
      "getSquadGroupDetail" | "listAvailableCharactersForOwner"
    >
  ) {
    this.store = store;
  }

  /** List Jaruna characters accessible to the squad group owner. */
  async list(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Promise<
    Result<
      readonly AvailableSquadCharacter[],
      | SquadGroupNotFound
      | ActorCannotViewSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  > {
    const group = await this.store.getSquadGroupDetail(input);

    if (isError(group)) {
      return err(group.error);
    }

    return this.store.listAvailableCharactersForOwner({
      ownerUserId: group.value.ownerUserId,
    });
  }
}

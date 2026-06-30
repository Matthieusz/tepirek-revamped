import * as Effect from "effect/Effect";

import type { AppUserId } from "../app-user-id";
import type { SquadGroupId } from "../squad-group-id";
import type { AvailableSquadCharacter } from "../squad-group-snapshot";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors";
import type {
  ActorCannotViewSquadGroup,
  SquadGroupNotFound,
} from "./squad-group-store";
import { EffectSquadGroupStore } from "./squad-group-store";

/** Expected failures returned by listing available squad characters. */
export type ListAvailableSquadCharactersError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | EffectSquadBuilderPersistenceUnavailable;

/** Service module for listing accessible Jaruna characters for a squad group owner. */
export class ListAvailableSquadCharacters {
  private readonly serviceName = "ListAvailableSquadCharacters";

  /** List Jaruna characters accessible to the squad group owner. */
  readonly list = (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Effect.Effect<
    readonly AvailableSquadCharacter[],
    ListAvailableSquadCharactersError,
    EffectSquadGroupStore
  > => {
    void this.serviceName;

    return Effect.gen(function* listAvailableSquadCharactersEffect() {
      const group = yield* EffectSquadGroupStore.use((store) =>
        store.getSquadGroupDetail(input)
      );

      return yield* EffectSquadGroupStore.use((store) =>
        store.listAvailableCharactersForOwner({
          ownerUserId: group.ownerUserId,
        })
      );
    });
  };
}

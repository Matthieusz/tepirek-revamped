import * as Effect from "effect/Effect";

import type { AppUserId } from "../app-user-id.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type { AvailableSquadCharacter } from "../squad-group-snapshot.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import type {
  ActorCannotViewSquadGroup,
  SquadGroupNotFound,
} from "./squad-group-store.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";

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

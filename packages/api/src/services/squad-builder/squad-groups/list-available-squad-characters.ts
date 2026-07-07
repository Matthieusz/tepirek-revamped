import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import type {
  ActorCannotViewSquadGroup,
  SquadGroupNotFound,
} from "./squad-group-store.js";
import { SquadGroupStoreService } from "./squad-group-store.js";

/** Expected failures returned by listing available squad characters. */
export type ListAvailableSquadCharactersError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | EffectSquadBuilderPersistenceUnavailable;

/** List Jaruna characters accessible to the squad group owner. */
export const list = Effect.fn("SquadGroups.listAvailableCharacters")(
  function* listAvailableSquadCharacters(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) {
    const group = yield* SquadGroupStoreService.use((store) =>
      store.getSquadGroupDetail(input)
    );

    return yield* SquadGroupStoreService.use((store) =>
      store.listAvailableCharactersForOwner({
        ownerUserId: group.ownerUserId,
      })
    );
  }
);

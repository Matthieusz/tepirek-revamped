import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.ts";
import type {
  ActorCannotViewSquadGroup,
  SquadGroupNotFound,
} from "./squad-group-store.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

/** Input for listing characters available to a squad group. */
export interface ListAvailableSquadCharactersInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}

/** Expected failures returned by listing available squad characters. */
export type ListAvailableSquadCharactersError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | EffectSquadBuilderPersistenceUnavailable;

/** List Jaruna characters accessible to the squad group owner. */
export const list = Effect.fn("SquadGroups.listAvailableCharacters")(
  function* listAvailableSquadCharacters(
    input: ListAvailableSquadCharactersInput
  ) {
    const store = yield* SquadGroupStoreService;
    const group = yield* store.getSquadGroupDetail(input);
    return yield* store.listAvailableCharactersForOwner({
      ownerUserId: group.ownerUserId,
    });
  }
);

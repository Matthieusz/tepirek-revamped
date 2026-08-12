import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { SquadGroupAggregateStoreService } from "./squad-group-aggregate-store.ts";
import { SquadGroupDirectoryStoreService } from "./squad-group-directory-store.ts";
import type {
  ActorCannotViewSquadGroup,
  SquadBuilderPersistenceUnavailable,
  SquadGroupNotFound,
} from "./squad-group-errors.ts";

/** Input for listing characters available to a squad group. */
export interface ListAvailableSquadCharactersInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}

/** Expected failures returned by listing available squad characters. */
export type ListAvailableSquadCharactersError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | SquadBuilderPersistenceUnavailable;

/** List Jaruna characters accessible to the squad group owner. */
export const list = Effect.fn("SquadGroups.listAvailableCharacters")(
  function* listAvailableSquadCharacters(
    input: ListAvailableSquadCharactersInput
  ) {
    const aggregateStore = yield* SquadGroupAggregateStoreService;
    const directoryStore = yield* SquadGroupDirectoryStoreService;
    const group = yield* aggregateStore.getSquadGroupDetail(input);
    return yield* directoryStore.listAvailableCharactersForOwner({
      ownerUserId: group.ownerUserId,
    });
  }
);

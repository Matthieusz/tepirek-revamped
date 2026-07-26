import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type {
  EffectSquadBuilderPersistenceUnavailable,
  ActorDoesNotOwnSquadGroup,
  SquadGroupNotFound,
} from "./squad-group-errors.ts";
import * as SquadGroupStore from "./squad-group-store.ts";

/** Input for permanently deleting a squad group. */
export interface DeleteSquadGroupInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}

/** Expected failures returned by squad group deletion. */
export type DeleteSquadGroupError =
  | SquadGroupNotFound
  | ActorDoesNotOwnSquadGroup
  | EffectSquadBuilderPersistenceUnavailable;

/** Permanently delete a squad group owned by the actor. */
export const deleteSquadGroup = Effect.fn("SquadGroups.delete")(
  function* deleteSquadGroup(input: DeleteSquadGroupInput) {
    const store = yield* SquadGroupStore.SquadGroupStoreService;
    yield* store.deleteSquadGroup(input);
  }
);

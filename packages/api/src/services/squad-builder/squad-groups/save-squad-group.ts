import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type {
  SaveSquadInput,
  SquadGroupValidationError,
} from "../../../domain/squad-builder/squad-group-snapshot.ts";
import { validateSquadGroupSnapshot } from "../../../domain/squad-builder/squad-group-snapshot.ts";
import type {
  EffectSquadBuilderPersistenceUnavailable,
  SquadGroupWriteConflict,
} from "./squad-group-errors.ts";
import * as SquadGroupStore from "./squad-group-store.ts";

export type { SaveSquadInput };

/** Input for saving a full squad group snapshot. */
export interface SaveSquadGroupInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly expectedUpdatedAt: Date;
  readonly name: string;
  readonly squads: readonly SaveSquadInput[];
}

/** Expected failures returned by squad group snapshot save. */
export type SaveSquadGroupError =
  | SquadGroupStore.SquadGroupNotFound
  | SquadGroupStore.ActorCannotViewSquadGroup
  | SquadGroupStore.ActorDoesNotOwnSquadGroup
  | SquadGroupWriteConflict
  | SquadGroupValidationError
  | EffectSquadBuilderPersistenceUnavailable;

/** Save a full squad group snapshot for its owner. */
export const save = Effect.fn("SquadGroups.save")(function* saveSquadGroup(
  input: SaveSquadGroupInput
) {
  const store = yield* SquadGroupStore.SquadGroupStoreService;
  yield* store.getSquadGroupDetail({
    actorUserId: input.actorUserId,
    groupId: input.groupId,
  });

  const availableCharacters = yield* store.listAvailableCharactersForOwner({
    ownerUserId: input.actorUserId,
  });

  const snapshot = yield* validateSquadGroupSnapshot({
    actorUserId: input.actorUserId,
    availableCharacters,
    groupId: input.groupId,
    name: input.name,
    squads: input.squads,
  });

  const now = yield* DateTime.nowAsDate;
  return yield* store.saveSquadGroupSnapshot({
    actorUserId: input.actorUserId,
    availableCharacters,
    expectedUpdatedAt: input.expectedUpdatedAt,
    now,
    snapshot,
  });
});

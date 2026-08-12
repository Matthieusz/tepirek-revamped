import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type {
  SaveSquadInput,
  SquadGroupValidationError,
} from "../../../domain/squad-builder/squad-group-snapshot.ts";
import { parseSquadGroupSnapshot } from "../../../domain/squad-builder/squad-group-snapshot.ts";
import { SquadGroupAggregateStoreService } from "./squad-group-aggregate-store.ts";
import type {
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  SquadBuilderPersistenceUnavailable,
  SquadGroupNotFound,
  SquadGroupWriteConflict,
  SquadNotInGroup,
} from "./squad-group-errors.ts";

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
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | ActorDoesNotOwnSquadGroup
  | SquadGroupWriteConflict
  | SquadNotInGroup
  | SquadGroupValidationError
  | SquadBuilderPersistenceUnavailable;

/** Save a full squad group snapshot for its owner. */
export const save = Effect.fn("SquadGroups.save")(function* saveSquadGroup(
  input: SaveSquadGroupInput
) {
  const aggregateStore = yield* SquadGroupAggregateStoreService;
  const snapshot = yield* parseSquadGroupSnapshot({
    groupId: input.groupId,
    name: input.name,
    squads: input.squads,
  });

  const now = yield* DateTime.nowAsDate;
  return yield* aggregateStore.saveSquadGroupSnapshot({
    actorUserId: input.actorUserId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    now,
    snapshot,
  });
});

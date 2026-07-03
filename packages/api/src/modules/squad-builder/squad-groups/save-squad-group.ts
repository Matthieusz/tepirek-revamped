import * as Effect from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import { isError } from "../result.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type {
  SaveSquadInput,
  SquadGroupValidationError,
} from "../squad-group-snapshot.js";
import { validateSquadGroupSnapshot } from "../squad-group-snapshot.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import type {
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  SquadGroupNotFound,
} from "./squad-group-store.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";

export type { SaveSquadInput };

/** Input for saving a full squad group snapshot. */
export interface SaveSquadGroupInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly name: string;
  readonly squads: readonly SaveSquadInput[];
}

/** Expected failures returned by squad group snapshot save. */
export type SaveSquadGroupError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | ActorDoesNotOwnSquadGroup
  | SquadGroupValidationError
  | EffectSquadBuilderPersistenceUnavailable;

/** Service module that validates and atomically saves squad group snapshots. */
export class SaveSquadGroup {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Validate and atomically save a full squad group snapshot. */
  readonly save = Effect.fn("SquadGroups.save")(function* saveSquadGroup(
    this: SaveSquadGroup,
    input: SaveSquadGroupInput
  ) {
    const { clock } = this;

    yield* EffectSquadGroupStore.use((store) =>
      store.getSquadGroupDetail({
        actorUserId: input.actorUserId,
        groupId: input.groupId,
      })
    );

    const availableCharacters = yield* EffectSquadGroupStore.use((store) =>
      store.listAvailableCharactersForOwner({
        ownerUserId: input.actorUserId,
      })
    );

    const snapshot = validateSquadGroupSnapshot({
      actorUserId: input.actorUserId,
      availableCharacters,
      groupId: input.groupId,
      name: input.name,
      squads: input.squads,
    });

    if (isError(snapshot)) {
      return yield* Effect.fail(snapshot.error);
    }

    return yield* EffectSquadGroupStore.use((store) =>
      store.saveSquadGroupSnapshot({
        actorUserId: input.actorUserId,
        availableCharacters,
        now: clock.now(),
        snapshot: snapshot.value,
      })
    );
  });
}

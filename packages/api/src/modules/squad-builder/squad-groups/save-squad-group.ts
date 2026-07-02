import * as Effect from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { AppUserId } from "../app-user-id";
import { isError } from "../result";
import type { SquadGroupId } from "../squad-group-id";
import type {
  SaveSquadInput,
  SquadGroupValidationError,
} from "../squad-group-snapshot";
import { validateSquadGroupSnapshot } from "../squad-group-snapshot";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors";
import type {
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  SquadGroupDetail,
  SquadGroupNotFound,
} from "./squad-group-store";
import { EffectSquadGroupStore } from "./squad-group-store";

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
  save(
    input: SaveSquadGroupInput
  ): Effect.Effect<
    SquadGroupDetail,
    SaveSquadGroupError,
    EffectSquadGroupStore
  > {
    const { clock } = this;

    return Effect.gen(function* saveSquadGroupEffect() {
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
}

import type { Effect } from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { AppUserId } from "../app-user-id";
import type { SquadGroupId } from "../squad-group-id";
import type {
  InvalidSquadGroupVisibility,
  SquadGroupVisibility,
} from "../squad-group-visibility";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors";
import type {
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  SquadGroupNotFound,
  SquadGroupVisibilityChange,
} from "./squad-group-store";
import { EffectSquadGroupStore } from "./squad-group-store";

/** Expected failures for global squad visibility operations. */
export type GlobalSquadVisibilityError =
  | SquadGroupNotFound
  | ActorDoesNotOwnSquadGroup
  | ActorCannotViewSquadGroup
  | InvalidSquadGroupVisibility
  | EffectSquadBuilderPersistenceUnavailable;

/** Service module for owner-only squad group visibility changes. */
export class SetSquadGroupVisibility {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Change squad group visibility as the owner. */
  set(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly visibility: SquadGroupVisibility;
  }): Effect<
    SquadGroupVisibilityChange,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable,
    EffectSquadGroupStore
  > {
    return EffectSquadGroupStore.use((store) =>
      store.setSquadGroupVisibility({
        actorUserId: input.actorUserId,
        groupId: input.groupId,
        now: this.clock.now(),
        visibility: input.visibility,
      })
    );
  }
}

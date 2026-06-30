import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { AppUserId } from "../app-user-id";
import type { Result } from "../result";
import type { SquadGroupId } from "../squad-group-id";
import type {
  InvalidSquadGroupVisibility,
  SquadGroupVisibility,
} from "../squad-group-visibility";
import type {
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  GlobalSquadVisibilityStore,
  SquadBuilderPersistenceUnavailable,
  SquadGroupNotFound,
  SquadGroupVisibilityChange,
} from "./squad-group-store";

/** Expected failures for global squad visibility operations. */
export type GlobalSquadVisibilityError =
  | SquadGroupNotFound
  | ActorDoesNotOwnSquadGroup
  | ActorCannotViewSquadGroup
  | InvalidSquadGroupVisibility
  | SquadBuilderPersistenceUnavailable;

/** Service module for owner-only squad group visibility changes. */
export class SetSquadGroupVisibility {
  private readonly store: Pick<
    GlobalSquadVisibilityStore,
    "setSquadGroupVisibility"
  >;
  private readonly clock: Clock;

  constructor(
    store: Pick<GlobalSquadVisibilityStore, "setSquadGroupVisibility">,
    clock: Clock
  ) {
    this.store = store;
    this.clock = clock;
  }

  /** Change squad group visibility as the owner. */
  set(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly visibility: SquadGroupVisibility;
  }): Promise<Result<SquadGroupVisibilityChange, GlobalSquadVisibilityError>> {
    return this.store.setSquadGroupVisibility({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
      now: this.clock.now(),
      visibility: input.visibility,
    });
  }
}

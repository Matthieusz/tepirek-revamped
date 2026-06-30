import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { AppUserId } from "../app-user-id";
import { err, isError } from "../result";
import type { Result } from "../result";
import type { SquadGroupId } from "../squad-group-id";
import type {
  SaveSquadInput,
  SquadGroupValidationError,
} from "../squad-group-snapshot";
import { validateSquadGroupSnapshot } from "../squad-group-snapshot";
import type {
  ActorCannotViewSquadGroup,
  SquadBuilderPersistenceUnavailable,
  SquadGroupDetail,
  SquadGroupNotFound,
  SquadGroupStore,
} from "./squad-group-store";

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
  | SquadGroupValidationError
  | SquadBuilderPersistenceUnavailable;

/** Service module that validates and atomically saves squad group snapshots. */
export class SaveSquadGroup {
  private readonly store: Pick<
    SquadGroupStore,
    | "getSquadGroupDetail"
    | "listAvailableCharactersForOwner"
    | "saveSquadGroupSnapshot"
  >;
  private readonly clock: Clock;

  constructor(
    store: Pick<
      SquadGroupStore,
      | "getSquadGroupDetail"
      | "listAvailableCharactersForOwner"
      | "saveSquadGroupSnapshot"
    >,
    clock: Clock
  ) {
    this.store = store;
    this.clock = clock;
  }

  /** Validate and atomically save a full squad group snapshot. */
  async save(
    input: SaveSquadGroupInput
  ): Promise<Result<SquadGroupDetail, SaveSquadGroupError>> {
    const group = await this.store.getSquadGroupDetail({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
    });

    if (isError(group)) {
      return err(group.error);
    }

    const availableCharacters =
      await this.store.listAvailableCharactersForOwner({
        ownerUserId: input.actorUserId,
      });

    if (isError(availableCharacters)) {
      return err(availableCharacters.error);
    }

    const snapshot = validateSquadGroupSnapshot({
      actorUserId: input.actorUserId,
      availableCharacters: availableCharacters.value,
      groupId: input.groupId,
      name: input.name,
      squads: input.squads,
    });

    if (isError(snapshot)) {
      return err(snapshot.error);
    }

    return this.store.saveSquadGroupSnapshot({
      actorUserId: input.actorUserId,
      availableCharacters: availableCharacters.value,
      now: this.clock.now(),
      snapshot: snapshot.value,
    });
  }
}

import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { AppUserId } from "../app-user-id";
import { err, isError, ok } from "../result";
import type { Result } from "../result";
import type { SquadGroupId } from "../squad-group-id";
import type {
  SquadCharacterDraftPlacement,
  SquadGroupValidationError,
} from "../squad-group-snapshot";
import { validateSquadGroupSnapshot } from "../squad-group-snapshot";
import type { SquadId } from "../squad-id";
import type {
  ActorCannotViewSquadGroup,
  SquadBuilderPersistenceUnavailable,
  SquadGroupDetail,
  SquadGroupNotFound,
  SquadGroupSharingStore,
  SquadGroupStore,
} from "./squad-group-store";

export interface SharedSquadCharactersInput {
  readonly squadId: SquadId;
  readonly characters: readonly {
    readonly characterId: number;
    readonly position: number;
  }[];
}

export interface SaveSharedSquadGroupCharactersInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly squads: readonly SharedSquadCharactersInput[];
}

export interface SharedSquadGroupCharactersSnapshot {
  readonly groupId: SquadGroupId;
  readonly squads: readonly {
    readonly squadId: SquadId;
    readonly characters: readonly SquadCharacterDraftPlacement[];
  }[];
}

export type SharedSquadGroupSaveError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | { readonly _tag: "ActorCannotEditSquadGroup" }
  | { readonly _tag: "SquadNotInGroup"; readonly squadId: SquadId }
  | { readonly _tag: "EditorCannotChangeSquadStructure" }
  | SquadGroupValidationError
  | SquadBuilderPersistenceUnavailable;

/** Save character placements in existing squads as owner or accepted editor. */
export class SaveSharedSquadGroupCharacters {
  private readonly sharingStore: SquadGroupSharingStore;
  private readonly squadStore: Pick<
    SquadGroupStore,
    "getSquadGroupDetail" | "listAvailableCharactersForOwner"
  >;
  private readonly clock: Clock;

  constructor(
    sharingStore: SquadGroupSharingStore,
    squadStore: Pick<
      SquadGroupStore,
      "getSquadGroupDetail" | "listAvailableCharactersForOwner"
    >,
    clock: Clock
  ) {
    this.sharingStore = sharingStore;
    this.squadStore = squadStore;
    this.clock = clock;
  }

  async save(
    input: SaveSharedSquadGroupCharactersInput
  ): Promise<Result<SquadGroupDetail, SharedSquadGroupSaveError>> {
    const access = await this.sharingStore.authorizeSquadGroupEditor({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
    });

    if (isError(access)) {
      return err(access.error);
    }

    const detail = await this.squadStore.getSquadGroupDetail({
      actorUserId: access.value.ownerUserId,
      groupId: input.groupId,
    });

    if (isError(detail)) {
      return err(detail.error);
    }

    const existingSquadIds = new Set<number>();
    for (const squad of detail.value.squads) {
      existingSquadIds.add(squad.squadId);
    }

    if (input.squads.length !== detail.value.squads.length) {
      return err({ _tag: "EditorCannotChangeSquadStructure" });
    }

    for (const submitted of input.squads) {
      if (!existingSquadIds.has(submitted.squadId)) {
        return err({ _tag: "SquadNotInGroup", squadId: submitted.squadId });
      }
    }

    const submittedIds = new Set(input.squads.map((squad) => squad.squadId));
    if (submittedIds.size !== existingSquadIds.size) {
      return err({ _tag: "EditorCannotChangeSquadStructure" });
    }

    const availableCharacters =
      await this.squadStore.listAvailableCharactersForOwner({
        ownerUserId: access.value.ownerUserId,
      });

    if (isError(availableCharacters)) {
      return err(availableCharacters.error);
    }

    const submittedBySquadId = new Map<number, SharedSquadCharactersInput>();
    for (const submitted of input.squads) {
      submittedBySquadId.set(submitted.squadId, submitted);
    }

    const validation = validateSquadGroupSnapshot({
      actorUserId: access.value.ownerUserId,
      availableCharacters: availableCharacters.value,
      groupId: input.groupId,
      name: detail.value.name,
      squads: detail.value.squads.map((squad) => ({
        characters: submittedBySquadId.get(squad.squadId)?.characters ?? [],
        clientKey: `squad-${squad.squadId}`,
        name: squad.name,
        position: squad.position,
        squadId: squad.squadId,
      })),
    });

    if (isError(validation)) {
      return err(validation.error);
    }

    const result = await this.sharingStore.saveSharedSquadGroupCharacters({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
      now: this.clock.now(),
      snapshot: {
        groupId: input.groupId,
        squads: validation.value.squads.map((squad) => ({
          characters: squad.characters,
          squadId: squad.squadId as SquadId,
        })),
      },
    });

    if (isError(result)) {
      return err(result.error);
    }

    return ok(result.value);
  }
}

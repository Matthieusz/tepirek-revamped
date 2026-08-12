import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type {
  SharedSquadGroupCharactersSnapshot,
  SquadCharacterDraftPlacement,
  SquadGroupValidationError,
} from "../../../domain/squad-builder/squad-group-snapshot.ts";
import { parseCharacterPosition } from "../../../domain/squad-builder/squad-group-snapshot.ts";
import type { SquadId } from "../../../domain/squad-builder/squad-id.ts";
import type {
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  EditorCannotChangeSquadStructure,
  SquadBuilderPersistenceUnavailable,
  SquadGroupNotFound,
  SquadGroupWriteConflict,
  SquadNotInGroup,
} from "./squad-group-errors.ts";
import { SquadGroupSharingStoreService } from "./squad-group-sharing-store.ts";

interface SharedSquadCharactersInput {
  readonly squadId: SquadId;
  readonly characters: readonly {
    readonly characterId: number;
    readonly position: number;
  }[];
}

export interface SaveSharedSquadGroupCharactersInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly expectedUpdatedAt: Date;
  readonly squads: readonly SharedSquadCharactersInput[];
}

export type EffectSharedSquadGroupSaveError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | ActorCannotEditSquadGroup
  | SquadNotInGroup
  | EditorCannotChangeSquadStructure
  | SquadGroupWriteConflict
  | SquadGroupValidationError
  | SquadBuilderPersistenceUnavailable;

/** Save character placements in a shared squad group. */
export const saveWithStoreService = Effect.fn(
  "SquadGroups.saveSharedCharacters"
)(function* saveSharedSquadGroupCharacters(
  input: SaveSharedSquadGroupCharactersInput
) {
  const sharingStore = yield* SquadGroupSharingStoreService;
  const snapshotSquads: SharedSquadGroupCharactersSnapshot["squads"][number][] =
    [];

  for (const squad of input.squads) {
    const characters: SquadCharacterDraftPlacement[] = [];
    for (const character of squad.characters) {
      characters.push({
        characterId: character.characterId,
        position: yield* parseCharacterPosition(character.position),
      });
    }
    snapshotSquads.push({ characters, squadId: squad.squadId });
  }

  const now = yield* DateTime.nowAsDate;
  return yield* sharingStore.saveSharedSquadGroupCharacters({
    actorUserId: input.actorUserId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    groupId: input.groupId,
    now,
    snapshot: {
      groupId: input.groupId,
      squads: snapshotSquads,
    },
  });
});

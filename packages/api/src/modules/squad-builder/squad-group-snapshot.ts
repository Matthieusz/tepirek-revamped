import type { AccountDisplayName } from "./account-display-name";
import type { AppUserId } from "./app-user-id";
import type { MargonemAccountId } from "./margonem-account-id";
import type { MargonemProfession, MargonemWorld } from "./margonem-character";
import type { MargonemCharacterId, PositiveLevel } from "./margonem-profile-id";
import { err, isError, ok } from "./result";
import type { Result } from "./result";
import type { SquadGroupId } from "./squad-group-id";
import type { SquadId } from "./squad-id";
import { parseSquadGroupName, parseSquadName } from "./squad-name";
import type {
  InvalidSquadGroupName,
  InvalidSquadName,
  SquadGroupName,
  SquadName,
} from "./squad-name";

/** Position of a squad inside a group snapshot. */
export type SquadPosition = number & { readonly __brand: "SquadPosition" };

/** Position of a character inside one squad. */
export type CharacterPosition = number & {
  readonly __brand: "CharacterPosition";
};

/** Available character read model used by validation and UI projections. */
export interface AvailableSquadCharacter {
  readonly characterId: number;
  readonly margonemCharacterId: MargonemCharacterId;
  readonly accountId: MargonemAccountId;
  readonly accountDisplayName: AccountDisplayName;
  readonly accountOwnerUserId: AppUserId;
  readonly accountOwnerUserName: string;
  readonly accountOwnerUserImage: string | null;
  readonly name: string;
  readonly level: PositiveLevel;
  readonly profession: MargonemProfession;
  readonly avatarUrl: string | null;
  readonly world: MargonemWorld;
}

/** Parsed full draft snapshot for an explicit squad group save. */
export interface SquadGroupDraftSnapshot {
  readonly groupId: SquadGroupId;
  readonly name: SquadGroupName;
  readonly squads: readonly SquadDraftSnapshot[];
}

/** Parsed squad draft snapshot. */
export interface SquadDraftSnapshot {
  readonly clientKey: string;
  readonly squadId?: SquadId;
  readonly name: SquadName;
  readonly position: SquadPosition;
  readonly characters: readonly SquadCharacterDraftPlacement[];
}

/** Parsed character placement inside a squad draft. */
export interface SquadCharacterDraftPlacement {
  readonly characterId: number;
  readonly position: CharacterPosition;
}

/** Raw squad input accepted by the save service after id parsing. */
export interface SaveSquadInput {
  readonly clientKey: string;
  readonly squadId?: SquadId;
  readonly name: string;
  readonly position: number;
  readonly characters: readonly {
    readonly characterId: number;
    readonly position: number;
  }[];
}

/** Expected snapshot validation failure. */
export type SquadGroupValidationError =
  | InvalidSquadGroupName
  | InvalidSquadName
  | { readonly _tag: "SquadGroupNotFound" }
  | { readonly _tag: "ActorDoesNotOwnSquadGroup" }
  | {
      readonly _tag: "TooManyCharactersInSquad";
      readonly squadClientKey: string;
      readonly maxCharacters: 10;
    }
  | {
      readonly _tag: "DuplicateCharacterInSquad";
      readonly squadClientKey: string;
      readonly characterId: number;
    }
  | {
      readonly _tag: "DuplicateAccountInSquad";
      readonly squadClientKey: string;
      readonly accountId: MargonemAccountId;
    }
  | {
      readonly _tag: "DuplicateCharacterInSquadGroup";
      readonly characterId: number;
    }
  | {
      readonly _tag: "SquadCharacterNotAccessible";
      readonly characterId: number;
    }
  | { readonly _tag: "SquadCharacterNotJaruna"; readonly characterId: number }
  | { readonly _tag: "InvalidSquadSnapshot"; readonly message: string };

/** Input for validating a full squad group snapshot. */
export interface ValidateSquadGroupSnapshotInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly name: string;
  readonly squads: readonly SaveSquadInput[];
  readonly availableCharacters: readonly AvailableSquadCharacter[];
}

const maxCharactersPerSquad = 10;

const parsePosition = (
  input: number
): Result<number, SquadGroupValidationError> => {
  if (!Number.isSafeInteger(input) || input < 0) {
    return err({
      _tag: "InvalidSquadSnapshot",
      message:
        "Pozycje składów i postaci muszą być nieujemnymi liczbami całkowitymi",
    });
  }

  return ok(input);
};

/** Validate a squad group snapshot against accessible Jaruna characters and group rules. */
export const validateSquadGroupSnapshot = ({
  availableCharacters,
  groupId,
  name,
  squads,
}: ValidateSquadGroupSnapshotInput): Result<
  SquadGroupDraftSnapshot,
  SquadGroupValidationError
> => {
  const parsedName = parseSquadGroupName(name);

  if (isError(parsedName)) {
    return err(parsedName.error);
  }

  const availableByCharacterId = new Map<number, AvailableSquadCharacter>();
  for (const character of availableCharacters) {
    availableByCharacterId.set(character.characterId, character);
  }

  const groupCharacterIds = new Set<number>();
  const parsedSquads: SquadDraftSnapshot[] = [];

  for (const squad of squads) {
    if (squad.clientKey.trim().length === 0) {
      return err({
        _tag: "InvalidSquadSnapshot",
        message: "Każdy skład musi mieć klucz klienta",
      });
    }

    const parsedSquadName = parseSquadName(squad.name);
    if (isError(parsedSquadName)) {
      return err(parsedSquadName.error);
    }

    const parsedSquadPosition = parsePosition(squad.position);
    if (isError(parsedSquadPosition)) {
      return err(parsedSquadPosition.error);
    }

    if (squad.characters.length > maxCharactersPerSquad) {
      return err({
        _tag: "TooManyCharactersInSquad",
        maxCharacters: maxCharactersPerSquad,
        squadClientKey: squad.clientKey,
      });
    }

    const squadCharacterIds = new Set<number>();
    const squadAccountIds = new Set<number>();
    const parsedCharacters: SquadCharacterDraftPlacement[] = [];

    for (const character of squad.characters) {
      const parsedCharacterPosition = parsePosition(character.position);
      if (isError(parsedCharacterPosition)) {
        return err(parsedCharacterPosition.error);
      }

      const availableCharacter = availableByCharacterId.get(
        character.characterId
      );
      if (availableCharacter === undefined) {
        return err({
          _tag: "SquadCharacterNotAccessible",
          characterId: character.characterId,
        });
      }

      if (availableCharacter.world !== "jaruna") {
        return err({
          _tag: "SquadCharacterNotJaruna",
          characterId: character.characterId,
        });
      }

      if (squadCharacterIds.has(character.characterId)) {
        return err({
          _tag: "DuplicateCharacterInSquad",
          characterId: character.characterId,
          squadClientKey: squad.clientKey,
        });
      }

      if (groupCharacterIds.has(character.characterId)) {
        return err({
          _tag: "DuplicateCharacterInSquadGroup",
          characterId: character.characterId,
        });
      }

      if (squadAccountIds.has(availableCharacter.accountId)) {
        return err({
          _tag: "DuplicateAccountInSquad",
          accountId: availableCharacter.accountId,
          squadClientKey: squad.clientKey,
        });
      }

      squadCharacterIds.add(character.characterId);
      groupCharacterIds.add(character.characterId);
      squadAccountIds.add(availableCharacter.accountId);
      parsedCharacters.push({
        characterId: character.characterId,
        position: parsedCharacterPosition.value as CharacterPosition,
      });
    }

    parsedSquads.push({
      characters: parsedCharacters,
      clientKey: squad.clientKey,
      name: parsedSquadName.value,
      position: parsedSquadPosition.value as SquadPosition,
      ...(squad.squadId === undefined ? {} : { squadId: squad.squadId }),
    });
  }

  return ok({
    groupId,
    name: parsedName.value,
    squads: parsedSquads,
  });
};

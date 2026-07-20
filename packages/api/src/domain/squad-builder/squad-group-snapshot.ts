import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { AccountDisplayName } from "./account-display-name.ts";
import type { AppUserId } from "./app-user-id.ts";
import type { MargonemAccountId } from "./margonem-account-id.ts";
import type { MargonemProfession } from "./margonem-character.ts";
import type {
  MargonemCharacterId,
  PositiveLevel,
} from "./margonem-profile-id.ts";
import type { SquadGroupId } from "./squad-group-id.ts";
import {
  DuplicateAccountInSquad,
  DuplicateCharacterInSquad,
  DuplicateCharacterInSquadGroup,
  InvalidSquadSnapshot,
  SquadCharacterNotAccessible,
  SquadCharacterNotJaruna,
  TooManyCharactersInSquad,
} from "./squad-group-validation-errors.ts";
import type { SquadGroupValidationError } from "./squad-group-validation-errors.ts";
import type { SquadId } from "./squad-id.ts";
import { parseSquadGroupName, parseSquadName } from "./squad-name.ts";
import type { SquadGroupName, SquadName } from "./squad-name.ts";

/** Position of a squad inside a group snapshot. */
const Position = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 0 })
);

export const SquadPosition = Position.pipe(Schema.brand("SquadPosition"));
export type SquadPosition = typeof SquadPosition.Type;

/** Position of a character inside one squad. */
export const CharacterPosition = Position.pipe(
  Schema.brand("CharacterPosition")
);
export type CharacterPosition = typeof CharacterPosition.Type;

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
  readonly world: string;
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

export type { SquadGroupValidationError };

/** Input for validating a full squad group snapshot. */
export interface ValidateSquadGroupSnapshotInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly name: string;
  readonly squads: readonly SaveSquadInput[];
  readonly availableCharacters: readonly AvailableSquadCharacter[];
}

const maxCharactersPerSquad = 10;

const invalidPosition = () =>
  new InvalidSquadSnapshot({
    message:
      "Pozycje składów i postaci muszą być nieujemnymi liczbami całkowitymi",
  });

const parseSquadPosition = (input: number) =>
  Schema.decodeUnknownEffect(SquadPosition)(input).pipe(
    Effect.mapError(invalidPosition)
  );

const parseCharacterPosition = (input: number) =>
  Schema.decodeUnknownEffect(CharacterPosition)(input).pipe(
    Effect.mapError(invalidPosition)
  );

/** Validate a squad group snapshot against accessible Jaruna characters and group rules. */
export const validateSquadGroupSnapshot = Effect.fn(
  "SquadGroupSnapshot.validate"
)(function* validateSquadGroupSnapshot(
  input: ValidateSquadGroupSnapshotInput
): Effect.fn.Return<SquadGroupDraftSnapshot, SquadGroupValidationError> {
  const { availableCharacters, groupId, name, squads } = input;

  const parsedName = yield* parseSquadGroupName(name);

  const availableByCharacterId = HashMap.fromIterable(
    availableCharacters.map(
      (character) => [character.characterId, character] as const
    )
  );

  let groupCharacterIds = HashSet.empty<number>();
  const parsedSquads: SquadDraftSnapshot[] = [];

  for (const squad of squads) {
    if (squad.clientKey.trim().length === 0) {
      return yield* new InvalidSquadSnapshot({
        message: "Każdy skład musi mieć klucz klienta",
      });
    }

    const parsedSquadName = yield* parseSquadName(squad.name);
    const parsedSquadPosition = yield* parseSquadPosition(squad.position);

    if (squad.characters.length > maxCharactersPerSquad) {
      return yield* new TooManyCharactersInSquad({
        maxCharacters: maxCharactersPerSquad,
        squadClientKey: squad.clientKey,
      });
    }

    let squadCharacterIds = HashSet.empty<number>();
    let squadAccountIds = HashSet.empty<number>();
    const parsedCharacters: SquadCharacterDraftPlacement[] = [];

    for (const character of squad.characters) {
      const parsedCharacterPosition = yield* parseCharacterPosition(
        character.position
      );

      const availableCharacterOption = HashMap.get(
        availableByCharacterId,
        character.characterId
      );
      if (Option.isNone(availableCharacterOption)) {
        return yield* new SquadCharacterNotAccessible({
          characterId: character.characterId,
        });
      }
      const availableCharacter = availableCharacterOption.value;

      if (availableCharacter.world !== "jaruna") {
        return yield* new SquadCharacterNotJaruna({
          characterId: character.characterId,
        });
      }

      if (HashSet.has(squadCharacterIds, character.characterId)) {
        return yield* new DuplicateCharacterInSquad({
          characterId: character.characterId,
          squadClientKey: squad.clientKey,
        });
      }

      if (HashSet.has(groupCharacterIds, character.characterId)) {
        return yield* new DuplicateCharacterInSquadGroup({
          characterId: character.characterId,
        });
      }

      if (HashSet.has(squadAccountIds, availableCharacter.accountId)) {
        return yield* new DuplicateAccountInSquad({
          accountId: availableCharacter.accountId,
          squadClientKey: squad.clientKey,
        });
      }

      squadCharacterIds = HashSet.add(squadCharacterIds, character.characterId);
      groupCharacterIds = HashSet.add(groupCharacterIds, character.characterId);
      squadAccountIds = HashSet.add(
        squadAccountIds,
        availableCharacter.accountId
      );
      parsedCharacters.push({
        characterId: character.characterId,
        position: parsedCharacterPosition,
      });
    }

    parsedSquads.push({
      characters: parsedCharacters,
      clientKey: squad.clientKey,
      name: parsedSquadName,
      position: parsedSquadPosition,
      ...(squad.squadId === undefined ? {} : { squadId: squad.squadId }),
    });
  }

  return {
    groupId,
    name: parsedName,
    squads: parsedSquads,
  };
});

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
import {
  validateSquadPlacementCount,
  validateSquadPlacements,
} from "./squad-placement.ts";
import type { SquadPlacementValidationError } from "./squad-placement.ts";

/** Position of a squad inside a group snapshot. */
const Position = Schema.Finite.check(
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

/** Character placements saved for a shared squad group. */
export interface SharedSquadGroupCharactersSnapshot {
  readonly groupId: SquadGroupId;
  readonly squads: readonly {
    readonly squadId: SquadId;
    readonly characters: readonly SquadCharacterDraftPlacement[];
  }[];
}

/** Parsed full draft snapshot for an explicit squad group save. */
export interface SquadGroupDraftSnapshot {
  readonly groupId: SquadGroupId;
  readonly name: SquadGroupName;
  readonly squads: readonly SquadDraftSnapshot[];
}

/** Parsed squad draft snapshot. */
export interface SquadDraftSnapshot {
  /** Client-only key used to address a draft squad; it is not persisted. */
  readonly clientKey: string;
  /** Existing persisted squad to update; omitted for a new squad. */
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
  /** Client-only key used to address a draft squad; it is not persisted. */
  readonly clientKey: string;
  /** Existing persisted squad to update; omitted for a new squad. */
  readonly squadId?: SquadId;
  readonly name: string;
  readonly position: number;
  readonly characters: readonly {
    readonly characterId: number;
    readonly position: number;
  }[];
}

export type { SquadGroupValidationError } from "./squad-group-validation-errors.ts";

/** Input for parsing a full squad group snapshot before persistence. */
export interface ParseSquadGroupSnapshotInput {
  readonly groupId: SquadGroupId;
  readonly name: string;
  readonly squads: readonly SaveSquadInput[];
}

/** Input for validating a parsed snapshot against accessible characters. */
export interface ValidateParsedSquadGroupSnapshotInput {
  readonly snapshot: SquadGroupDraftSnapshot;
  readonly availableCharacters: readonly AvailableSquadCharacter[];
}

/** Input for validating a full squad group snapshot. */
export interface ValidateSquadGroupSnapshotInput extends ParseSquadGroupSnapshotInput {
  readonly actorUserId: AppUserId;
  readonly availableCharacters: readonly AvailableSquadCharacter[];
}

const invalidPosition = () =>
  new InvalidSquadSnapshot({
    message:
      "Pozycje składów i postaci muszą być nieujemnymi liczbami całkowitymi",
  });

const parseSquadPosition = (input: number) =>
  Schema.decodeEffect(SquadPosition)(input).pipe(
    Effect.mapError(invalidPosition)
  );

/** Parse a character position and return a typed validation failure when invalid. */
export const parseCharacterPosition = (input: number) =>
  Schema.decodeEffect(CharacterPosition)(input).pipe(
    Effect.mapError(invalidPosition)
  );

const unreachablePlacementError = (error: never): never => {
  throw new Error(`Unhandled squad placement error: ${String(error)}`);
};

const toSnapshotValidationError = (
  error: SquadPlacementValidationError<MargonemAccountId>
): SquadGroupValidationError => {
  switch (error._tag) {
    case "TooManyCharactersInSquad": {
      return new TooManyCharactersInSquad({
        maxCharacters: error.maxCharacters,
        squadClientKey: error.squadClientKey,
      });
    }
    case "DuplicateCharacterInSquad": {
      return new DuplicateCharacterInSquad({
        characterId: error.characterId,
        squadClientKey: error.squadClientKey,
      });
    }
    case "DuplicateCharacterInSquadGroup": {
      return new DuplicateCharacterInSquadGroup({
        characterId: error.characterId,
      });
    }
    case "DuplicateAccountInSquad": {
      return new DuplicateAccountInSquad({
        accountId: error.accountId,
        squadClientKey: error.squadClientKey,
      });
    }
    default: {
      return unreachablePlacementError(error);
    }
  }
};

/** Parse names, positions, and snapshot structure without consulting access state. */
export const parseSquadGroupSnapshot = Effect.fn("SquadGroupSnapshot.parse")(
  function* parseSquadGroupSnapshot(
    input: ParseSquadGroupSnapshotInput
  ): Effect.fn.Return<SquadGroupDraftSnapshot, SquadGroupValidationError> {
    const parsedName = yield* parseSquadGroupName(input.name);
    const parsedSquads: SquadDraftSnapshot[] = [];
    let squadIds = HashSet.empty<number>();

    for (const squad of input.squads) {
      if (squad.squadId !== undefined && HashSet.has(squadIds, squad.squadId)) {
        return yield* new InvalidSquadSnapshot({
          message: "Identyfikator składu może wystąpić tylko raz",
        });
      }

      if (squad.squadId !== undefined) {
        squadIds = HashSet.add(squadIds, squad.squadId);
      }

      if (squad.clientKey.trim().length === 0) {
        return yield* new InvalidSquadSnapshot({
          message: "Każdy skład musi mieć klucz klienta",
        });
      }

      const placementCountError = validateSquadPlacementCount(
        squad.clientKey,
        squad.characters.length
      );
      if (placementCountError !== undefined) {
        return yield* toSnapshotValidationError(placementCountError);
      }

      const parsedCharacters: SquadCharacterDraftPlacement[] = [];
      for (const character of squad.characters) {
        parsedCharacters.push({
          characterId: character.characterId,
          position: yield* parseCharacterPosition(character.position),
        });
      }

      const parsedSquad = {
        characters: parsedCharacters,
        clientKey: squad.clientKey,
        name: yield* parseSquadName(squad.name),
        position: yield* parseSquadPosition(squad.position),
      };
      parsedSquads.push(
        squad.squadId === undefined
          ? parsedSquad
          : { ...parsedSquad, squadId: squad.squadId }
      );
    }

    return {
      groupId: input.groupId,
      name: parsedName,
      squads: parsedSquads,
    };
  }
);

/** Validate a parsed snapshot against current accessible Jaruna characters. */
export const validateParsedSquadGroupSnapshot = Effect.fn(
  "SquadGroupSnapshot.validateParsed"
)(function* validateParsedSquadGroupSnapshot(
  input: ValidateParsedSquadGroupSnapshotInput
): Effect.fn.Return<SquadGroupDraftSnapshot, SquadGroupValidationError> {
  const { availableCharacters, snapshot } = input;
  const availableByCharacterId = HashMap.fromIterable(
    availableCharacters.map(
      (character) => [character.characterId, character] as const
    )
  );

  const placementSquads = [];
  for (const squad of snapshot.squads) {
    const placementCharacters = [];

    for (const character of squad.characters) {
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

      placementCharacters.push({
        accountId: availableCharacter.accountId,
        characterId: character.characterId,
      });
    }

    placementSquads.push({
      characters: placementCharacters,
      squadClientKey: squad.clientKey,
    });
  }

  const placementError = validateSquadPlacements(placementSquads);
  if (placementError !== undefined) {
    return yield* toSnapshotValidationError(placementError);
  }

  return snapshot;
});

/** Validate a full squad group snapshot against accessible Jaruna characters and group rules. */
export const validateSquadGroupSnapshot = Effect.fn(
  "SquadGroupSnapshot.validate"
)(function* validateSquadGroupSnapshot(
  input: ValidateSquadGroupSnapshotInput
): Effect.fn.Return<SquadGroupDraftSnapshot, SquadGroupValidationError> {
  const snapshot = yield* parseSquadGroupSnapshot(input);
  return yield* validateParsedSquadGroupSnapshot({
    availableCharacters: input.availableCharacters,
    snapshot,
  });
});

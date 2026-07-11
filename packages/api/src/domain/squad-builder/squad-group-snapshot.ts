import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { AccountDisplayName } from "./account-display-name.js";
import type { AppUserId } from "./app-user-id.js";
import type { MargonemAccountId } from "./margonem-account-id.js";
import type {
  MargonemProfession,
  MargonemWorld,
} from "./margonem-character.js";
import type {
  MargonemCharacterId,
  PositiveLevel,
} from "./margonem-profile-id.js";
import type { SquadGroupId } from "./squad-group-id.js";
import type { SquadId } from "./squad-id.js";
import { parseSquadGroupName, parseSquadName } from "./squad-name.js";
import type {
  InvalidSquadGroupName,
  InvalidSquadName,
  SquadGroupName,
  SquadName,
} from "./squad-name.js";

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

const invalidPosition = () => ({
  _tag: "InvalidSquadSnapshot" as const,
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
export const validateSquadGroupSnapshot = (
  input: ValidateSquadGroupSnapshotInput
): Effect.Effect<SquadGroupDraftSnapshot, SquadGroupValidationError> =>
  Effect.gen(function* validateSquadGroupSnapshotGen() {
    const { availableCharacters, groupId, name, squads } = input;

    const parsedName = yield* parseSquadGroupName(name);

    const availableByCharacterId = new Map<number, AvailableSquadCharacter>();
    for (const character of availableCharacters) {
      availableByCharacterId.set(character.characterId, character);
    }

    const groupCharacterIds = new Set<number>();
    const parsedSquads: SquadDraftSnapshot[] = [];

    for (const squad of squads) {
      if (squad.clientKey.trim().length === 0) {
        return yield* Effect.fail({
          _tag: "InvalidSquadSnapshot",
          message: "Każdy skład musi mieć klucz klienta",
        } as const);
      }

      const parsedSquadName = yield* parseSquadName(squad.name);
      const parsedSquadPosition = yield* parseSquadPosition(squad.position);

      if (squad.characters.length > maxCharactersPerSquad) {
        return yield* Effect.fail({
          _tag: "TooManyCharactersInSquad",
          maxCharacters: maxCharactersPerSquad,
          squadClientKey: squad.clientKey,
        } as const);
      }

      const squadCharacterIds = new Set<number>();
      const squadAccountIds = new Set<number>();
      const parsedCharacters: SquadCharacterDraftPlacement[] = [];

      for (const character of squad.characters) {
        const parsedCharacterPosition = yield* parseCharacterPosition(
          character.position
        );

        const availableCharacter = availableByCharacterId.get(
          character.characterId
        );
        if (availableCharacter === undefined) {
          return yield* Effect.fail({
            _tag: "SquadCharacterNotAccessible",
            characterId: character.characterId,
          } as const);
        }

        if (availableCharacter.world !== "jaruna") {
          return yield* Effect.fail({
            _tag: "SquadCharacterNotJaruna",
            characterId: character.characterId,
          } as const);
        }

        if (squadCharacterIds.has(character.characterId)) {
          return yield* Effect.fail({
            _tag: "DuplicateCharacterInSquad",
            characterId: character.characterId,
            squadClientKey: squad.clientKey,
          } as const);
        }

        if (groupCharacterIds.has(character.characterId)) {
          return yield* Effect.fail({
            _tag: "DuplicateCharacterInSquadGroup",
            characterId: character.characterId,
          } as const);
        }

        if (squadAccountIds.has(availableCharacter.accountId)) {
          return yield* Effect.fail({
            _tag: "DuplicateAccountInSquad",
            accountId: availableCharacter.accountId,
            squadClientKey: squad.clientKey,
          } as const);
        }

        squadCharacterIds.add(character.characterId);
        groupCharacterIds.add(character.characterId);
        squadAccountIds.add(availableCharacter.accountId);
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

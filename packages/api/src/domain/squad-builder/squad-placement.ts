/** The maximum number of characters that may be placed in one squad. */
export const MAX_SQUAD_CHARACTERS = 10 as const;

/** Account identifier used when applying the squad placement policy. */
export type SquadPlacementAccountId = string | number;

/** Character identity and account ownership used by the placement policy. */
export interface SquadPlacementCharacter<
  AccountId extends SquadPlacementAccountId = SquadPlacementAccountId,
> {
  readonly characterId: number;
  /** Omitted only when a client cannot resolve an existing character. */
  readonly accountId?: AccountId;
}

/** The placements in one squad, identified by its client-owned key. */
export interface SquadPlacementSquad<
  AccountId extends SquadPlacementAccountId = SquadPlacementAccountId,
> {
  readonly squadClientKey: string;
  readonly characters: readonly SquadPlacementCharacter<AccountId>[];
}

/** A capacity failure produced before character metadata is available. */
export interface SquadPlacementCapacityError {
  readonly _tag: "TooManyCharactersInSquad";
  readonly maxCharacters: typeof MAX_SQUAD_CHARACTERS;
  readonly squadClientKey: string;
}

/** A failure produced by the squad placement policy. */
export type SquadPlacementValidationError<
  AccountId extends SquadPlacementAccountId = SquadPlacementAccountId,
> =
  | SquadPlacementCapacityError
  | {
      readonly _tag: "DuplicateCharacterInSquad";
      readonly characterId: number;
      readonly squadClientKey: string;
    }
  | {
      readonly _tag: "DuplicateCharacterInSquadGroup";
      readonly characterId: number;
    }
  | {
      readonly _tag: "DuplicateAccountInSquad";
      readonly accountId: AccountId;
      readonly squadClientKey: string;
    };

/** Check the canonical capacity of one squad. */
export const validateSquadPlacementCount = (
  squadClientKey: string,
  characterCount: number
): SquadPlacementCapacityError | undefined =>
  characterCount > MAX_SQUAD_CHARACTERS
    ? {
        _tag: "TooManyCharactersInSquad",
        maxCharacters: MAX_SQUAD_CHARACTERS,
        squadClientKey,
      }
    : undefined;

/**
 * Validate squad capacity, character uniqueness, and account uniqueness.
 * Returns the first policy failure in squad and character order.
 */
export const validateSquadPlacements = <
  AccountId extends SquadPlacementAccountId,
>(
  squads: readonly SquadPlacementSquad<AccountId>[]
): SquadPlacementValidationError<AccountId> | undefined => {
  const groupCharacterIds = new Set<number>();

  for (const squad of squads) {
    const countError = validateSquadPlacementCount(
      squad.squadClientKey,
      squad.characters.length
    );
    if (countError !== undefined) {
      return countError;
    }

    const squadCharacterIds = new Set<number>();
    const squadAccountIds = new Set<string>();

    for (const character of squad.characters) {
      if (squadCharacterIds.has(character.characterId)) {
        return {
          _tag: "DuplicateCharacterInSquad",
          characterId: character.characterId,
          squadClientKey: squad.squadClientKey,
        };
      }

      if (groupCharacterIds.has(character.characterId)) {
        return {
          _tag: "DuplicateCharacterInSquadGroup",
          characterId: character.characterId,
        };
      }

      if (character.accountId !== undefined) {
        const key = String(character.accountId);
        if (squadAccountIds.has(key)) {
          return {
            _tag: "DuplicateAccountInSquad",
            accountId: character.accountId,
            squadClientKey: squad.squadClientKey,
          };
        }
        squadAccountIds.add(key);
      }

      squadCharacterIds.add(character.characterId);
      groupCharacterIds.add(character.characterId);
    }
  }

  return undefined;
};

import { validateSquadPlacements } from "@tepirek-revamped/api/domain/squad-builder/squad-placement";
import type {
  AvailableSquadCharacterSchema,
  SquadGroupDetailSchema,
} from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import * as Data from "effect/Data";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

type SquadGroupDetail = SquadGroupDetailSchema;
export type AvailableCharacter = AvailableSquadCharacterSchema;

interface DraftCharacter {
  readonly characterId: number;
}

export interface DraftSquad {
  readonly clientKey: string;
  readonly squadId?: number;
  readonly name: string;
  readonly characters: readonly DraftCharacter[];
}

export interface SquadGroupDraft {
  readonly groupId: number;
  readonly name: string;
  readonly squads: readonly DraftSquad[];
}

export type PlacementError = Data.TaggedEnum<{
  readonly readOnly: Record<never, never>;
  readonly unknownCharacter: { readonly characterId: number };
  readonly unknownSquad: { readonly squadKey: string };
  readonly squadFull: { readonly squadName: string };
  readonly accountAlreadyRepresented: {
    readonly squadName: string;
    readonly accountDisplayName: string;
  };
  readonly duplicateCharacterInSquad: {
    readonly characterId: number;
    readonly squadName: string;
  };
  readonly duplicateCharacterInGroup: { readonly characterId: number };
}>;
export const PlacementError = Data.taggedEnum<PlacementError>();

type PlacementResult = Data.TaggedEnum<{
  readonly success: { readonly draft: SquadGroupDraft };
  readonly failure: { readonly error: PlacementError };
}>;
const PlacementResult = Data.taggedEnum<PlacementResult>();

interface SaveSquadGroupPayload {
  readonly groupId: number;
  readonly name: string;
  readonly squads: readonly {
    readonly characters: readonly {
      readonly characterId: number;
      readonly position: number;
    }[];
    readonly clientKey: string;
    readonly name: string;
    readonly position: number;
    readonly squadId?: number;
  }[];
}

interface SaveSharedSquadGroupCharactersPayload {
  readonly groupId: number;
  readonly squads: readonly {
    readonly characters: readonly {
      readonly characterId: number;
      readonly position: number;
    }[];
    readonly squadId: number;
  }[];
}

export interface CharacterAccountInfo {
  readonly accountDisplayName: string;
  readonly accountId: string | number;
}

const sameCharacters = (
  left: readonly DraftCharacter[],
  right: readonly DraftCharacter[]
): boolean =>
  left.length === right.length &&
  left.every(
    (character, index) => character.characterId === right[index]?.characterId
  );

export const hydrateDraft = (detail: SquadGroupDetail): SquadGroupDraft => ({
  groupId: detail.groupId,
  name: detail.name,
  squads: detail.squads.map((squad) => ({
    characters: squad.characters.map((character) => ({
      characterId: character.characterId,
    })),
    clientKey: `saved-${squad.squadId}`,
    name: squad.name,
    squadId: squad.squadId,
  })),
});

export const isDraftEqual = (
  left: SquadGroupDraft,
  right: SquadGroupDraft
): boolean =>
  left.groupId === right.groupId &&
  left.name === right.name &&
  left.squads.length === right.squads.length &&
  left.squads.every((squad, index) => {
    const other = right.squads[index];
    return (
      other !== undefined &&
      squad.clientKey === other.clientKey &&
      squad.squadId === other.squadId &&
      squad.name === other.name &&
      sameCharacters(squad.characters, other.characters)
    );
  });

const getCurrentSquad = (
  draft: SquadGroupDraft,
  characterId: number
): DraftSquad | undefined =>
  draft.squads.find((squad) =>
    squad.characters.some((character) => character.characterId === characterId)
  );

const hasCharacterInSquad = (squad: DraftSquad, characterId: number): boolean =>
  squad.characters.some((character) => character.characterId === characterId);

const toPlacementSquads = (
  draft: SquadGroupDraft,
  characterId: number,
  targetSquadKey: string,
  character: CharacterAccountInfo,
  charactersById: HashMap.HashMap<number, CharacterAccountInfo>
) =>
  draft.squads.map((squad) => {
    const characters = squad.characters
      .filter((draftCharacter) => draftCharacter.characterId !== characterId)
      .map((draftCharacter) => {
        const accountInfo = HashMap.get(
          charactersById,
          draftCharacter.characterId
        ).pipe(Option.getOrUndefined);
        return accountInfo === undefined
          ? { characterId: draftCharacter.characterId }
          : {
              accountId: accountInfo.accountId,
              characterId: draftCharacter.characterId,
            };
      });
    const targetCharacter =
      squad.clientKey === targetSquadKey
        ? [{ accountId: character.accountId, characterId }]
        : [];

    return {
      characters: [...characters, ...targetCharacter],
      squadClientKey: squad.clientKey,
    };
  });

const unreachablePlacementError = (error: never): never => {
  throw new Error(`Unhandled squad placement error: ${String(error)}`);
};

const policyErrorToPlacementError = (
  error: ReturnType<typeof validateSquadPlacements>,
  targetSquadName: string,
  character: CharacterAccountInfo
): PlacementError | undefined => {
  if (error === undefined) {
    return undefined;
  }

  switch (error._tag) {
    case "TooManyCharactersInSquad": {
      return PlacementError.squadFull({ squadName: targetSquadName });
    }
    case "DuplicateAccountInSquad": {
      return PlacementError.accountAlreadyRepresented({
        accountDisplayName: character.accountDisplayName,
        squadName: targetSquadName,
      });
    }
    case "DuplicateCharacterInSquad": {
      return PlacementError.duplicateCharacterInSquad({
        characterId: error.characterId,
        squadName: targetSquadName,
      });
    }
    case "DuplicateCharacterInSquadGroup": {
      return PlacementError.duplicateCharacterInGroup({
        characterId: error.characterId,
      });
    }
    default: {
      return unreachablePlacementError(error);
    }
  }
};

export const getPlacementError = (
  draft: SquadGroupDraft,
  characterId: number,
  squadKey: string,
  charactersById: HashMap.HashMap<number, CharacterAccountInfo>,
  canEdit: boolean
): PlacementError | undefined => {
  if (!canEdit) {
    return PlacementError.readOnly();
  }

  const character = HashMap.get(charactersById, characterId).pipe(
    Option.getOrUndefined
  );
  if (character === undefined) {
    return PlacementError.unknownCharacter({ characterId });
  }

  const squad = draft.squads.find((item) => item.clientKey === squadKey);
  if (squad === undefined) {
    return PlacementError.unknownSquad({ squadKey });
  }

  const currentSquad = getCurrentSquad(draft, characterId);
  if (currentSquad?.clientKey === squadKey) {
    return undefined;
  }

  return policyErrorToPlacementError(
    validateSquadPlacements(
      toPlacementSquads(draft, characterId, squadKey, character, charactersById)
    ),
    squad.name,
    character
  );
};

export const applyPlacement = (
  draft: SquadGroupDraft,
  characterId: number,
  squadKey: string,
  charactersById: HashMap.HashMap<number, CharacterAccountInfo>,
  canEdit: boolean
): PlacementResult => {
  const error = getPlacementError(
    draft,
    characterId,
    squadKey,
    charactersById,
    canEdit
  );
  if (error !== undefined) {
    return PlacementResult.failure({ error });
  }

  const currentSquad = getCurrentSquad(draft, characterId);
  if (currentSquad?.clientKey === squadKey) {
    return PlacementResult.success({ draft });
  }

  return PlacementResult.success({
    draft: {
      ...draft,
      squads: draft.squads.map((squad) => {
        const withoutCharacter = squad.characters.filter(
          (character) => character.characterId !== characterId
        );
        if (squad.clientKey !== squadKey) {
          return withoutCharacter.length === squad.characters.length
            ? squad
            : { ...squad, characters: withoutCharacter };
        }

        return {
          ...squad,
          characters: [...withoutCharacter, { characterId }],
        };
      }),
    },
  });
};

export const removeCharacter = (
  draft: SquadGroupDraft,
  characterId: number,
  canEdit: boolean
): SquadGroupDraft => {
  if (!canEdit) {
    return draft;
  }

  return {
    ...draft,
    squads: draft.squads.map((squad) =>
      hasCharacterInSquad(squad, characterId)
        ? {
            ...squad,
            characters: squad.characters.filter(
              (character) => character.characterId !== characterId
            ),
          }
        : squad
    ),
  };
};

export const projectOwnerPayload = (
  draft: SquadGroupDraft
): SaveSquadGroupPayload => ({
  groupId: draft.groupId,
  name: draft.name.trim(),
  squads: draft.squads.map((squad, position) => {
    const payload = {
      characters: squad.characters.map((character, characterPosition) => ({
        characterId: character.characterId,
        position: characterPosition,
      })),
      clientKey: squad.clientKey,
      name: squad.name.trim(),
      position,
    };
    return squad.squadId === undefined
      ? payload
      : { ...payload, squadId: squad.squadId };
  }),
});

export const projectEditorPayload = (
  draft: SquadGroupDraft
): SaveSharedSquadGroupCharactersPayload => ({
  groupId: draft.groupId,
  squads: draft.squads.flatMap((squad) =>
    squad.squadId === undefined
      ? []
      : [
          {
            characters: squad.characters.map((character, position) => ({
              characterId: character.characterId,
              position,
            })),
            squadId: squad.squadId,
          },
        ]
  ),
});

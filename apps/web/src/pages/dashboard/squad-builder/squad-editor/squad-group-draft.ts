import type {
  AvailableSquadCharacterSchema,
  SquadGroupDetailSchema,
} from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

type SquadGroupDetail = typeof SquadGroupDetailSchema.Type;
export type AvailableCharacter = typeof AvailableSquadCharacterSchema.Type;

export const MAX_SQUAD_CHARACTERS = 10;

export interface DraftCharacter {
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

export type PlacementError =
  | { readonly _tag: "readOnly" }
  | { readonly _tag: "unknownCharacter"; readonly characterId: number }
  | { readonly _tag: "unknownSquad"; readonly squadKey: string }
  | { readonly _tag: "squadFull"; readonly squadName: string }
  | {
      readonly _tag: "accountAlreadyRepresented";
      readonly squadName: string;
      readonly accountDisplayName: string;
    };

type PlacementResult =
  | { readonly _tag: "success"; readonly draft: SquadGroupDraft }
  | { readonly _tag: "failure"; readonly error: PlacementError };

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

export const getPlacementError = (
  draft: SquadGroupDraft,
  characterId: number,
  squadKey: string,
  charactersById: HashMap.HashMap<number, CharacterAccountInfo>,
  canEdit: boolean
): PlacementError | undefined => {
  if (!canEdit) {
    return { _tag: "readOnly" };
  }

  const character = HashMap.get(charactersById, characterId).pipe(
    Option.getOrUndefined
  );
  if (character === undefined) {
    return { _tag: "unknownCharacter", characterId };
  }

  const squad = draft.squads.find((item) => item.clientKey === squadKey);
  if (squad === undefined) {
    return { _tag: "unknownSquad", squadKey };
  }

  const currentSquad = getCurrentSquad(draft, characterId);
  if (currentSquad?.clientKey === squadKey) {
    return undefined;
  }

  const targetCharacters = squad.characters.filter(
    (current) => current.characterId !== characterId
  );
  if (targetCharacters.length >= MAX_SQUAD_CHARACTERS) {
    return { _tag: "squadFull", squadName: squad.name };
  }

  const sameAccountCharacter = targetCharacters.find((current) => {
    const currentCharacter = HashMap.get(
      charactersById,
      current.characterId
    ).pipe(Option.getOrUndefined);
    return (
      currentCharacter !== undefined &&
      String(currentCharacter.accountId) === String(character.accountId)
    );
  });
  if (sameAccountCharacter !== undefined) {
    return {
      _tag: "accountAlreadyRepresented",
      accountDisplayName: character.accountDisplayName,
      squadName: squad.name,
    };
  }

  return undefined;
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
    return { _tag: "failure", error };
  }

  const currentSquad = getCurrentSquad(draft, characterId);
  if (currentSquad?.clientKey === squadKey) {
    return { _tag: "success", draft };
  }

  return {
    _tag: "success",
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
  };
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
  squads: draft.squads.map((squad, position) => ({
    characters: squad.characters.map((character, characterPosition) => ({
      characterId: character.characterId,
      position: characterPosition,
    })),
    clientKey: squad.clientKey,
    name: squad.name.trim(),
    position,
    ...(squad.squadId === undefined ? {} : { squadId: squad.squadId }),
  })),
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

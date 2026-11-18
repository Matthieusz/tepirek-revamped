/* eslint-disable promise/prefer-await-to-callbacks -- Effect Match handlers are synchronous pattern handlers, not Promise callbacks. */
import { validateSquadPlacements } from "@tepirek-revamped/api/domain/squad-builder/squad-placement";
import type {
  AvailableSquadCharacterSchema,
  SquadGroupDetailSchema,
} from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import * as Data from "effect/Data";
import * as HashMap from "effect/HashMap";
import * as Match from "effect/Match";
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

export type PlacementError =
  | { readonly _tag: "readOnly" }
  | { readonly _tag: "unknownCharacter"; readonly characterId: number }
  | { readonly _tag: "unknownSquad"; readonly squadKey: string }
  | { readonly _tag: "squadFull"; readonly squadName: string }
  | {
      readonly _tag: "accountAlreadyRepresented";
      readonly squadName: string;
      readonly accountDisplayName: string;
    }
  | {
      readonly _tag: "duplicateCharacterInSquad";
      readonly characterId: number;
      readonly squadName: string;
    }
  | {
      readonly _tag: "duplicateCharacterInGroup";
      readonly characterId: number;
    };

export const PlacementError = Data.taggedEnum<PlacementError>();

type PlacementResult = Data.TaggedEnum<{
  readonly success: { readonly draft: SquadGroupDraft };
  readonly failure: { readonly error: PlacementError };
}>;

const PlacementResult = Data.taggedEnum<PlacementResult>();

export interface CharacterAccountInfo {
  readonly accountDisplayName: string;
  readonly accountId: string | number;
}

const sameCharacters = (
  left: readonly DraftCharacter[],
  right: readonly DraftCharacter[]
) =>
  left.length === right.length &&
  left.every(
    (character, index) => character.characterId === right[index]?.characterId
  );

export const hydrateDraft = (detail: SquadGroupDetail) => ({
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

export const isDraftEqual = (left: SquadGroupDraft, right: SquadGroupDraft) =>
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

const getCurrentSquad = (draft: SquadGroupDraft, characterId: number) =>
  draft.squads.find((squad) =>
    squad.characters.some((character) => character.characterId === characterId)
  );

const hasCharacterInSquad = (squad: DraftSquad, characterId: number) =>
  squad.characters.some((character) => character.characterId === characterId);

const toPlacementSquads = (
  draft: SquadGroupDraft,
  characterId: number,
  targetSquadKey: string,
  character: CharacterAccountInfo,
  charactersById: HashMap.HashMap<number, CharacterAccountInfo>
) =>
  draft.squads.map((squad) => {
    const characters: {
      readonly accountId?: string | number;
      readonly characterId: number;
    }[] = [];

    for (const draftCharacter of squad.characters) {
      if (draftCharacter.characterId === characterId) {
        continue;
      }

      const accountInfo = HashMap.get(
        charactersById,
        draftCharacter.characterId
      ).pipe(Option.getOrUndefined);

      characters.push(
        accountInfo === undefined
          ? { characterId: draftCharacter.characterId }
          : {
              accountId: accountInfo.accountId,
              characterId: draftCharacter.characterId,
            }
      );
    }

    if (squad.clientKey === targetSquadKey) {
      characters.push({ accountId: character.accountId, characterId });
    }

    return {
      characters,
      squadClientKey: squad.clientKey,
    };
  });

const policyErrorToPlacementError: (
  input: ReturnType<typeof validateSquadPlacements>,
  targetSquadName: string,
  character: CharacterAccountInfo
) => PlacementError | undefined = (
  input: ReturnType<typeof validateSquadPlacements>,
  targetSquadName: string,
  character: CharacterAccountInfo
) =>
  input === null
    ? undefined
    : Match.value(input).pipe(
        Match.tag("TooManyCharactersInSquad", () =>
          PlacementError.squadFull({ squadName: targetSquadName })
        ),
        Match.tag("DuplicateAccountInSquad", () =>
          PlacementError.accountAlreadyRepresented({
            accountDisplayName: character.accountDisplayName,
            squadName: targetSquadName,
          })
        ),
        Match.tag("DuplicateCharacterInSquad", (error) =>
          PlacementError.duplicateCharacterInSquad({
            characterId: error.characterId,
            squadName: targetSquadName,
          })
        ),
        Match.tag("DuplicateCharacterInSquadGroup", (error) =>
          PlacementError.duplicateCharacterInGroup({
            characterId: error.characterId,
          })
        ),
        Match.exhaustive
      );

export const getPlacementError: (
  draft: SquadGroupDraft,
  characterId: number,
  squadKey: string,
  charactersById: HashMap.HashMap<number, CharacterAccountInfo>,
  canEdit: boolean
) => PlacementError | undefined = (
  draft: SquadGroupDraft,
  characterId: number,
  squadKey: string,
  charactersById: HashMap.HashMap<number, CharacterAccountInfo>,
  canEdit: boolean
) => {
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

  return currentSquad?.clientKey === squadKey
    ? undefined
    : policyErrorToPlacementError(
        validateSquadPlacements(
          toPlacementSquads(
            draft,
            characterId,
            squadKey,
            character,
            charactersById
          )
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
) => {
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
) => {
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

export const projectOwnerPayload = (draft: SquadGroupDraft) => ({
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

export const projectEditorPayload = (draft: SquadGroupDraft) => ({
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

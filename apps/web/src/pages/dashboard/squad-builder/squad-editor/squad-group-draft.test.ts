import { describe, expect, it } from "vitest";

import {
  applyPlacement,
  getPlacementError,
  isDraftEqual,
  projectEditorPayload,
  projectOwnerPayload,
  removeCharacter,
} from "./squad-group-draft";
import type {
  CharacterAccountInfo,
  SquadGroupDraft,
} from "./squad-group-draft";

const draft: SquadGroupDraft = {
  groupId: 7,
  name: "Kolos",
  squads: [
    {
      characters: [{ characterId: 1 }],
      clientKey: "saved-11",
      name: "Pierwszy",
      squadId: 11,
    },
    {
      characters: [{ characterId: 2 }],
      clientKey: "new-squad",
      name: "Drugi",
    },
  ],
};
const [firstSquad, secondSquad] = draft.squads;
if (firstSquad === undefined || secondSquad === undefined) {
  throw new Error("Test draft must include two squads");
}

const characters = new Map<number, CharacterAccountInfo>([
  [1, { accountDisplayName: "Konto A", accountId: "account-a" }],
  [2, { accountDisplayName: "Konto B", accountId: "account-b" }],
  [3, { accountDisplayName: "Konto C", accountId: "account-c" }],
  [4, { accountDisplayName: "Konto B", accountId: "account-b" }],
]);

describe("squad group draft", () => {
  it("moves a character atomically and keeps roster order", () => {
    const result = applyPlacement(draft, 1, "new-squad", characters, true);

    expect(result._tag).toBe("success");
    if (result._tag === "success") {
      expect(result.draft.squads[0]?.characters).toEqual([]);
      expect(result.draft.squads[1]?.characters).toEqual([
        { characterId: 2 },
        { characterId: 1 },
      ]);
    }
  });

  it("rejects a duplicate account and a full roster", () => {
    expect(getPlacementError(draft, 4, "new-squad", characters, true)).toEqual({
      _tag: "accountAlreadyRepresented",
      accountDisplayName: "Konto B",
      squadName: "Drugi",
    });

    const fullDraft: SquadGroupDraft = {
      ...draft,
      squads: [
        {
          ...firstSquad,
          characters: Array.from({ length: 10 }, (_, index) => ({
            characterId: index + 10,
          })),
        },
        secondSquad,
      ],
    };
    const fullCharacters = new Map(characters);
    for (let index = 10; index < 20; index += 1) {
      fullCharacters.set(index, {
        accountDisplayName: `Konto ${index}`,
        accountId: `account-${index}`,
      });
    }
    expect(
      getPlacementError(fullDraft, 3, "saved-11", fullCharacters, true)
    ).toEqual({ _tag: "squadFull", squadName: "Pierwszy" });
  });

  it("removes characters without changing other squads", () => {
    const next = removeCharacter(draft, 1, true);
    expect(next.squads[0]?.characters).toEqual([]);
    expect(next.squads[1]?.characters).toEqual([{ characterId: 2 }]);
    expect(removeCharacter(draft, 1, false)).toBe(draft);
  });

  it("projects positions at the save boundary", () => {
    expect(projectOwnerPayload(draft)).toEqual({
      groupId: 7,
      name: "Kolos",
      squads: [
        {
          characters: [{ characterId: 1, position: 0 }],
          clientKey: "saved-11",
          name: "Pierwszy",
          position: 0,
          squadId: 11,
        },
        {
          characters: [{ characterId: 2, position: 0 }],
          clientKey: "new-squad",
          name: "Drugi",
          position: 1,
        },
      ],
    });
    expect(projectEditorPayload(draft)).toEqual({
      groupId: 7,
      squads: [
        {
          characters: [{ characterId: 1, position: 0 }],
          squadId: 11,
        },
      ],
    });
  });

  it("compares domain state rather than array identity", () => {
    expect(isDraftEqual(draft, { ...draft, squads: [...draft.squads] })).toBe(
      true
    );
    expect(isDraftEqual(draft, { ...draft, name: "Inna nazwa" })).toBe(false);
  });
});

import * as HashSet from "effect/HashSet";
import { describe, expect, it } from "vitest";

import {
  filterAvailableCharacters,
  getAssignedCharacterIds,
  groupCharactersByAccount,
  parseCharacterPoolFilters,
} from "./character-pool-filters";
import type { CharacterPoolCharacter } from "./character-pool-filters";

const characters: readonly CharacterPoolCharacter[] = [
  {
    accountDisplayName: "Konto Łowcy",
    accountId: "konto-lowcy",
    accountOwnerUserName: "Ala",
    characterId: 1,
    level: 50,
    name: "Żmija",
    profession: "hunter",
  },
  {
    accountDisplayName: "Konto Maga",
    accountId: "konto-maga",
    accountOwnerUserName: "Bartek",
    characterId: 2,
    level: 40,
    name: "Łuna",
    profession: "mage",
  },
  {
    accountDisplayName: "Konto Maga",
    accountId: "konto-maga",
    accountOwnerUserName: "Bartek",
    characterId: 3,
    level: 60,
    name: "Adept",
    profession: "mage",
  },
  {
    accountDisplayName: "Konto wojownika",
    accountId: "konto-wojownika",
    accountOwnerUserName: "Celina",
    characterId: 4,
    level: 70,
    name: "Nieznany",
    profession: "newProfession",
  },
];

const makeFilter = (field: string, operator: string, values: unknown[]) => ({
  field,
  id: `${field}-test`,
  operator,
  values,
});

const ids = (filtered: readonly CharacterPoolCharacter[]): number[] =>
  filtered.map((character) => character.characterId);

describe("character pool filters", () => {
  it("excludes assigned characters before applying user filters", () => {
    const filters = parseCharacterPoolFilters([], "", "");

    expect(
      ids(
        filterAvailableCharacters(
          characters,
          getAssignedCharacterIds([
            { characters: [{ characterId: 2 }] },
            { characters: [{ characterId: 4 }] },
          ]),
          filters
        )
      )
    ).toEqual([1, 3]);
  });

  it("matches selected professions with OR semantics", () => {
    const filters = parseCharacterPoolFilters(
      [makeFilter("profession", "is_any_of", ["mage", "hunter"])],
      "",
      ""
    );

    expect(
      ids(filterAvailableCharacters(characters, HashSet.empty(), filters))
    ).toEqual([1, 2, 3]);
  });

  it("combines profession, names, and levels with AND semantics", () => {
    const filters = parseCharacterPoolFilters(
      [
        makeFilter("profession", "is_any_of", ["mage"]),
        makeFilter("characterName", "contains", ["ŁU"]),
        makeFilter("accountName", "contains", ["MAG"]),
      ],
      "40",
      "40"
    );

    expect(
      ids(filterAvailableCharacters(characters, HashSet.empty(), filters))
    ).toEqual([2]);
  });

  it("matches inclusive level bounds", () => {
    const filters = parseCharacterPoolFilters([], "40", "50");

    expect(
      ids(filterAvailableCharacters(characters, HashSet.empty(), filters))
    ).toEqual([1, 2]);
  });

  it("ignores a reversed level range while retaining other filters", () => {
    const filters = parseCharacterPoolFilters(
      [makeFilter("profession", "is_any_of", ["mage"])],
      "60",
      "40"
    );

    expect(filters.hasReversedLevelRange).toBe(true);
    expect(
      ids(filterAvailableCharacters(characters, HashSet.empty(), filters))
    ).toEqual([2, 3]);
  });

  it("treats malformed and negative bounds as invalid without filtering by them", () => {
    const filters = parseCharacterPoolFilters([], "1.5", "-10");

    expect(filters.hasInvalidLevelInput).toBe(true);
    expect(
      ids(filterAvailableCharacters(characters, HashSet.empty(), filters))
    ).toEqual([1, 2, 3, 4]);
  });

  it("keeps unknown professions visible until a known profession is selected", () => {
    const allFilters = parseCharacterPoolFilters([], "", "");
    const knownFilters = parseCharacterPoolFilters(
      [makeFilter("profession", "is_any_of", ["mage"])],
      "",
      ""
    );

    expect(
      ids(filterAvailableCharacters(characters, HashSet.empty(), allFilters))
    ).toEqual([1, 2, 3, 4]);
    expect(
      ids(filterAvailableCharacters(characters, HashSet.empty(), knownFilters))
    ).toEqual([2, 3]);
  });

  it("groups without mutating source order and sorts by account then level", () => {
    const getCharacter = (characterId: number): CharacterPoolCharacter => {
      const character = characters.find(
        (candidate) => candidate.characterId === characterId
      );
      if (character === undefined) {
        throw new Error(`Missing test character ${characterId}`);
      }
      return character;
    };
    const source = [getCharacter(3), getCharacter(1), getCharacter(2)];

    const groups = groupCharactersByAccount(source);

    expect(groups.map((group) => group.accountDisplayName)).toEqual([
      "Konto Łowcy",
      "Konto Maga",
    ]);
    expect(
      groups[1]?.characters.map((character) => character.characterId)
    ).toEqual([3, 2]);
    expect(source.map((character) => character.characterId)).toEqual([3, 1, 2]);
  });
});

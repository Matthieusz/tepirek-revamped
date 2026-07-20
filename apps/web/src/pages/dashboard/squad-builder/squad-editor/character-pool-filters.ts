import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";

import type { Filter } from "@/components/reui/filters-model";

type CharacterPoolFilterField = "profession" | "characterName" | "accountName";

const isUnsignedIntegerText = Schema.is(
  Schema.String.pipe(Schema.check(Schema.isPattern(/^\d+$/u)))
);
const PositiveIntegerFromString = Schema.NumberFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0))
);
const decodePositiveInteger = Schema.decodeUnknownOption(
  PositiveIntegerFromString
);

export interface CharacterPoolCharacter {
  readonly accountDisplayName: string;
  readonly accountId: string | number;
  readonly accountOwnerUserName: string;
  readonly characterId: number;
  readonly level: number;
  readonly name: string;
  readonly profession: string;
}

interface CharacterPoolFilters {
  readonly accountName: string;
  readonly characterName: string;
  readonly hasInvalidLevelInput: boolean;
  readonly hasReversedLevelRange: boolean;
  readonly levelFrom: number | null;
  readonly levelTo: number | null;
  readonly professions: readonly string[];
}

interface CharacterAccountGroup<T extends CharacterPoolCharacter> {
  readonly accountDisplayName: string;
  readonly accountId: string;
  readonly accountOwnerUserName: string;
  readonly characters: readonly T[];
}

const normalizeText = (value: string): string =>
  value.trim().normalize("NFC").toLocaleLowerCase("pl-PL");

const parseLevelInput = (
  rawValue: string
): { readonly invalid: boolean; readonly value: number | null } => {
  const value = rawValue.trim();
  if (value.length === 0) {
    return { invalid: false, value: null };
  }

  if (!isUnsignedIntegerText(value)) {
    return { invalid: true, value: null };
  }

  return Option.match(decodePositiveInteger(value), {
    onNone: () => ({ invalid: true, value: null }),
    onSome: (parsed) => ({ invalid: false, value: parsed }),
  });
};

const getStringValues = (filter: Filter<unknown>): readonly string[] =>
  Arr.filter(Predicate.isString)(filter.values);

const getTextFilterValue = (
  filters: readonly Filter<unknown>[],
  field: CharacterPoolFilterField
): string => {
  const filter = filters.find(
    (candidate) =>
      candidate.field === field && candidate.operator === "contains"
  );
  const value = filter === undefined ? "" : (getStringValues(filter)[0] ?? "");
  return normalizeText(value);
};

/** Parses ReUI filter values and raw level controls into local pool criteria. */
export const parseCharacterPoolFilters = (
  filters: readonly Filter<unknown>[],
  levelFromInput: string,
  levelToInput: string
): CharacterPoolFilters => {
  const professionValues = Arr.dedupe(
    filters.flatMap((filter) =>
      filter.field === "profession" && filter.operator === "is_any_of"
        ? getStringValues(filter).map(normalizeText)
        : []
    )
  );
  const levelFrom = parseLevelInput(levelFromInput);
  const levelTo = parseLevelInput(levelToInput);

  return {
    accountName: getTextFilterValue(filters, "accountName"),
    characterName: getTextFilterValue(filters, "characterName"),
    hasInvalidLevelInput: levelFrom.invalid || levelTo.invalid,
    hasReversedLevelRange:
      levelFrom.value !== null &&
      levelTo.value !== null &&
      levelFrom.value > levelTo.value,
    levelFrom: levelFrom.value,
    levelTo: levelTo.value,
    professions: professionValues,
  };
};

/** Returns every character ID currently represented by a draft squad. */
export const getAssignedCharacterIds = (
  squads: readonly {
    readonly characters: readonly { readonly characterId: number }[];
  }[]
): HashSet.HashSet<number> =>
  HashSet.fromIterable(
    squads.flatMap((squad) =>
      squad.characters.map((character) => character.characterId)
    )
  );

const matchesText = (value: string, query: string): boolean =>
  query.length === 0 || normalizeText(value).includes(query);

const matchesLevel = (
  level: number,
  filters: CharacterPoolFilters
): boolean => {
  if (filters.hasReversedLevelRange) {
    return true;
  }
  if (filters.levelFrom !== null && level < filters.levelFrom) {
    return false;
  }
  if (filters.levelTo !== null && level > filters.levelTo) {
    return false;
  }
  return true;
};

const matchesCharacter = (
  character: CharacterPoolCharacter,
  filters: CharacterPoolFilters
): boolean => {
  const professionMatches =
    filters.professions.length === 0 ||
    filters.professions.some(
      (profession) => normalizeText(character.profession) === profession
    );

  return (
    professionMatches &&
    matchesLevel(character.level, filters) &&
    matchesText(character.name, filters.characterName) &&
    matchesText(character.accountDisplayName, filters.accountName)
  );
};

/** Excludes assigned characters and applies all local pool criteria without mutation. */
export const filterAvailableCharacters = <T extends CharacterPoolCharacter>(
  characters: readonly T[],
  assignedCharacterIds: Iterable<number>,
  filters: CharacterPoolFilters
): readonly T[] => {
  const assignedCharacterIdSet = HashSet.fromIterable(assignedCharacterIds);
  return characters.filter(
    (character) =>
      !HashSet.has(assignedCharacterIdSet, character.characterId) &&
      matchesCharacter(character, filters)
  );
};

const comparePolishText = (left: string, right: string): number =>
  left.localeCompare(right, "pl-PL", { sensitivity: "base" });

/** Groups and sorts pool characters for the account-oriented tile layout. */
export const groupCharactersByAccount = <T extends CharacterPoolCharacter>(
  characters: readonly T[]
): readonly CharacterAccountGroup<T>[] => {
  const groups = Arr.groupBy(characters, (character) =>
    String(character.accountId)
  );

  return Record.toEntries(groups)
    .map(([accountId, group]) => ({
      accountDisplayName: group[0].accountDisplayName,
      accountId,
      accountOwnerUserName: group[0].accountOwnerUserName,
      characters: group.toSorted(
        (left, right) =>
          right.level - left.level ||
          comparePolishText(left.name, right.name) ||
          left.characterId - right.characterId
      ),
    }))
    .toSorted(
      (left, right) =>
        comparePolishText(left.accountDisplayName, right.accountDisplayName) ||
        comparePolishText(left.accountId, right.accountId)
    );
};

import type { Filter } from "@/components/reui/filters-model";

export type CharacterPoolFilterField =
  | "profession"
  | "characterName"
  | "accountName";

export interface CharacterPoolCharacter {
  readonly accountDisplayName: string;
  readonly accountId: string | number;
  readonly accountOwnerUserName: string;
  readonly characterId: number;
  readonly level: number;
  readonly name: string;
  readonly profession: string;
}

export interface CharacterPoolFilters {
  readonly accountName: string;
  readonly characterName: string;
  readonly hasInvalidLevelInput: boolean;
  readonly hasReversedLevelRange: boolean;
  readonly levelFrom: number | null;
  readonly levelTo: number | null;
  readonly professions: readonly string[];
}

export interface CharacterAccountGroup<T extends CharacterPoolCharacter> {
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

  if (!/^\d+$/u.test(value)) {
    return { invalid: true, value: null };
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return { invalid: true, value: null };
  }

  return { invalid: false, value: parsed };
};

const getStringValues = (filter: Filter<unknown>): readonly string[] =>
  filter.values.filter((value): value is string => typeof value === "string");

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
  const professionValues: string[] = [];
  const professionSet = new Set<string>();
  for (const filter of filters) {
    if (filter.field !== "profession" || filter.operator !== "is_any_of") {
      continue;
    }
    for (const value of getStringValues(filter)) {
      const normalizedProfession = normalizeText(value);
      if (!professionSet.has(normalizedProfession)) {
        professionSet.add(normalizedProfession);
        professionValues.push(normalizedProfession);
      }
    }
  }
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
): ReadonlySet<number> => {
  const assignedCharacterIds = new Set<number>();
  for (const squad of squads) {
    for (const character of squad.characters) {
      assignedCharacterIds.add(character.characterId);
    }
  }
  return assignedCharacterIds;
};

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
  assignedCharacterIds: ReadonlySet<number>,
  filters: CharacterPoolFilters
): readonly T[] =>
  characters.filter(
    (character) =>
      !assignedCharacterIds.has(character.characterId) &&
      matchesCharacter(character, filters)
  );

const comparePolishText = (left: string, right: string): number =>
  left.localeCompare(right, "pl-PL", { sensitivity: "base" });

/** Groups and sorts pool characters for the account-oriented tile layout. */
export const groupCharactersByAccount = <T extends CharacterPoolCharacter>(
  characters: readonly T[]
): readonly CharacterAccountGroup<T>[] => {
  const groups = new Map<
    string,
    { readonly characters: T[]; readonly first: T }
  >();

  for (const character of characters) {
    const accountId = String(character.accountId);
    const group = groups.get(accountId);
    if (group === undefined) {
      groups.set(accountId, { characters: [character], first: character });
    } else {
      group.characters.push(character);
    }
  }

  return [...groups.entries()]
    .map(([accountId, group]) => ({
      accountDisplayName: group.first.accountDisplayName,
      accountId,
      accountOwnerUserName: group.first.accountOwnerUserName,
      characters: group.characters.toSorted(
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

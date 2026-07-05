import * as Effect from "effect/Effect";

/** Normalized text query for browsing squad groups. */
export type SquadGroupNameQuery = string & {
  readonly __brand: "SquadGroupNameQuery";
};

/** Inclusive character-level bound for browsing squad groups. */
export type SquadGroupLevelBound = number & {
  readonly __brand: "SquadGroupLevelBound";
};

/** Character-level range for squad group list filtering. */
export type SquadGroupLevelRange =
  | {
      readonly _tag: "AnyLevel";
    }
  | {
      readonly _tag: "BoundedLevelRange";
      readonly minLevel?: SquadGroupLevelBound;
      readonly maxLevel?: SquadGroupLevelBound;
    };

/** Parsed filters for squad group browsing lists. */
export interface SquadGroupListFilters {
  readonly nameQuery?: SquadGroupNameQuery;
  readonly levelRange: SquadGroupLevelRange;
}

/** Policy for squad group browsing filters. */
export const squadGroupListFilterPolicy = {
  defaultLimit: 50,
  maxAllowedLevel: 500,
  minAllowedLevel: 1,
  nameQueryMaxLength: 80,
  nameQueryMinLength: 2,
} as const;

/** Empty squad group list filters matching the unfiltered list behavior. */
export const emptySquadGroupListFilters: SquadGroupListFilters = {
  levelRange: { _tag: "AnyLevel" },
};

/** Failure returned when a squad group name query is invalid. */
export interface InvalidSquadGroupNameQuery {
  readonly _tag: "InvalidSquadGroupNameQuery";
  readonly message: string;
}

/** Failure returned when a squad group character-level range is invalid. */
export interface InvalidSquadGroupLevelRange {
  readonly _tag: "InvalidSquadGroupLevelRange";
  readonly message: string;
}

/** Expected failures while parsing squad group list filters. */
export type SquadGroupListFilterError =
  | InvalidSquadGroupNameQuery
  | InvalidSquadGroupLevelRange;

/** Boundary input for squad group list filters. */
export interface ParseSquadGroupListFiltersInput {
  readonly nameQuery?: string | null | undefined;
  readonly minLevel?: number | null | undefined;
  readonly maxLevel?: number | null | undefined;
}

/** Convert a parsed name query to its string representation. */
export const squadGroupNameQueryToString = (
  query: SquadGroupNameQuery
): string => query;

/** Convert a parsed level bound to its number representation. */
export const squadGroupLevelBoundToNumber = (
  bound: SquadGroupLevelBound
): number => bound;

const normalizeNameQuery = (value: string): string =>
  value.trim().replaceAll(/\s+/gu, " ");

const parseNameQuery = (
  value: string | null | undefined
): Effect.Effect<
  | { readonly _tag: "Absent" }
  | {
      readonly _tag: "Present";
      readonly value: SquadGroupNameQuery;
    },
  InvalidSquadGroupNameQuery
> => {
  if (value === undefined || value === null) {
    return Effect.succeed({ _tag: "Absent" as const });
  }

  const normalized = normalizeNameQuery(value);
  if (normalized.length === 0) {
    return Effect.succeed({ _tag: "Absent" as const });
  }

  if (normalized.length < squadGroupListFilterPolicy.nameQueryMinLength) {
    return Effect.fail({
      _tag: "InvalidSquadGroupNameQuery",
      message: `Wpisz co najmniej ${squadGroupListFilterPolicy.nameQueryMinLength} znaki nazwy składu.`,
    });
  }

  if (normalized.length > squadGroupListFilterPolicy.nameQueryMaxLength) {
    return Effect.fail({
      _tag: "InvalidSquadGroupNameQuery",
      message: `Nazwa składu może mieć maksymalnie ${squadGroupListFilterPolicy.nameQueryMaxLength} znaków.`,
    });
  }

  // SAFETY: length and normalization invariants were established above.
  return Effect.succeed({
    _tag: "Present" as const,
    value: normalized as SquadGroupNameQuery,
  });
};

const parseLevelBound = (
  value: number | null | undefined,
  fieldName: "minLevel" | "maxLevel"
): Effect.Effect<
  | { readonly _tag: "Absent" }
  | {
      readonly _tag: "Present";
      readonly value: SquadGroupLevelBound;
    },
  InvalidSquadGroupLevelRange
> => {
  if (value === undefined || value === null) {
    return Effect.succeed({ _tag: "Absent" as const });
  }

  if (!Number.isInteger(value)) {
    return Effect.fail({
      _tag: "InvalidSquadGroupLevelRange",
      message: "Poziom postaci musi być liczbą całkowitą.",
    });
  }

  if (
    value < squadGroupListFilterPolicy.minAllowedLevel ||
    value > squadGroupListFilterPolicy.maxAllowedLevel
  ) {
    return Effect.fail({
      _tag: "InvalidSquadGroupLevelRange",
      message: `Poziom ${fieldName === "minLevel" ? "od" : "do"} musi być w zakresie ${squadGroupListFilterPolicy.minAllowedLevel}-${squadGroupListFilterPolicy.maxAllowedLevel}.`,
    });
  }

  // SAFETY: integer and allowed-range invariants were established above.
  return Effect.succeed({
    _tag: "Present" as const,
    value: value as SquadGroupLevelBound,
  });
};

type ParsedOptional<T> =
  | { readonly _tag: "Absent" }
  | { readonly _tag: "Present"; readonly value: T };

/** Parse and normalize squad group list filters before store access. */
export const parseSquadGroupListFilters = (
  input: ParseSquadGroupListFiltersInput = {}
): Effect.Effect<SquadGroupListFilters, SquadGroupListFilterError> => {
  let nameQuery: ParsedOptional<SquadGroupNameQuery>;
  let minLevel: ParsedOptional<SquadGroupLevelBound>;
  let maxLevel: ParsedOptional<SquadGroupLevelBound>;

  try {
    nameQuery = Effect.runSync(parseNameQuery(input.nameQuery));
    minLevel = Effect.runSync(parseLevelBound(input.minLevel, "minLevel"));
    maxLevel = Effect.runSync(parseLevelBound(input.maxLevel, "maxLevel"));
  } catch (error) {
    return Effect.fail(error as SquadGroupListFilterError);
  }

  if (
    minLevel._tag === "Present" &&
    maxLevel._tag === "Present" &&
    minLevel.value > maxLevel.value
  ) {
    return Effect.fail({
      _tag: "InvalidSquadGroupLevelRange",
      message: "Poziom od nie może być większy niż poziom do.",
    });
  }

  const levelRange: SquadGroupLevelRange =
    minLevel._tag === "Absent" && maxLevel._tag === "Absent"
      ? { _tag: "AnyLevel" }
      : {
          _tag: "BoundedLevelRange",
          ...(maxLevel._tag === "Absent" ? {} : { maxLevel: maxLevel.value }),
          ...(minLevel._tag === "Absent" ? {} : { minLevel: minLevel.value }),
        };

  return Effect.succeed({
    levelRange,
    ...(nameQuery._tag === "Absent" ? {} : { nameQuery: nameQuery.value }),
  });
};

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** Normalized text query for browsing squad groups. */
export const SquadGroupNameQuery = Schema.String.pipe(
  Schema.brand("SquadGroupNameQuery")
);
export type SquadGroupNameQuery = typeof SquadGroupNameQuery.Type;

/** Inclusive character-level bound for browsing squad groups. */
export const SquadGroupLevelBound = Schema.Number.pipe(
  Schema.brand("SquadGroupLevelBound")
);
export type SquadGroupLevelBound = typeof SquadGroupLevelBound.Type;

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
export class InvalidSquadGroupNameQuery extends Schema.TaggedErrorClass<InvalidSquadGroupNameQuery>()(
  "InvalidSquadGroupNameQuery",
  {
    message: Schema.String,
  }
) {}

/** Failure returned when a squad group character-level range is invalid. */
// oxlint-disable-next-line max-classes-per-file -- closely related domain errors
export class InvalidSquadGroupLevelRange extends Schema.TaggedErrorClass<InvalidSquadGroupLevelRange>()(
  "InvalidSquadGroupLevelRange",
  {
    message: Schema.String,
  }
) {}

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

const parseNameQuery = Effect.fnUntraced(function* parseNameQuery(
  value: string | null | undefined
): Effect.fn.Return<
  | { readonly _tag: "Absent" }
  | {
      readonly _tag: "Present";
      readonly value: SquadGroupNameQuery;
    },
  InvalidSquadGroupNameQuery
> {
  if (value === undefined || value === null) {
    return { _tag: "Absent" as const };
  }

  const normalized = normalizeNameQuery(value);
  if (normalized.length === 0) {
    return { _tag: "Absent" as const };
  }

  if (normalized.length < squadGroupListFilterPolicy.nameQueryMinLength) {
    return yield* new InvalidSquadGroupNameQuery({
      message: `Wpisz co najmniej ${squadGroupListFilterPolicy.nameQueryMinLength} znaki nazwy składu.`,
    });
  }

  if (normalized.length > squadGroupListFilterPolicy.nameQueryMaxLength) {
    return yield* new InvalidSquadGroupNameQuery({
      message: `Nazwa składu może mieć maksymalnie ${squadGroupListFilterPolicy.nameQueryMaxLength} znaków.`,
    });
  }

  return {
    _tag: "Present" as const,
    value: yield* Schema.decodeUnknownEffect(SquadGroupNameQuery)(
      normalized
    ).pipe(
      Effect.catchTag(
        "SchemaError",
        () =>
          new InvalidSquadGroupNameQuery({
            message: "Nieoczekiwany błąd walidacji zapytania o nazwę składu.",
          })
      )
    ),
  };
});

const parseLevelBound = Effect.fnUntraced(function* parseLevelBound(
  value: number | null | undefined,
  fieldName: "minLevel" | "maxLevel"
): Effect.fn.Return<
  | { readonly _tag: "Absent" }
  | {
      readonly _tag: "Present";
      readonly value: SquadGroupLevelBound;
    },
  InvalidSquadGroupLevelRange
> {
  if (value === undefined || value === null) {
    return { _tag: "Absent" as const };
  }

  if (!Number.isInteger(value)) {
    return yield* new InvalidSquadGroupLevelRange({
      message: "Poziom postaci musi być liczbą całkowitą.",
    });
  }

  if (
    value < squadGroupListFilterPolicy.minAllowedLevel ||
    value > squadGroupListFilterPolicy.maxAllowedLevel
  ) {
    return yield* new InvalidSquadGroupLevelRange({
      message: `Poziom ${fieldName === "minLevel" ? "od" : "do"} musi być w zakresie ${squadGroupListFilterPolicy.minAllowedLevel}-${squadGroupListFilterPolicy.maxAllowedLevel}.`,
    });
  }

  return {
    _tag: "Present" as const,
    value: yield* Schema.decodeUnknownEffect(SquadGroupLevelBound)(value).pipe(
      Effect.catchTag(
        "SchemaError",
        () =>
          new InvalidSquadGroupLevelRange({
            message: "Nieoczekiwany błąd walidacji zakresu poziomów.",
          })
      )
    ),
  };
});

/** Parse and normalize squad group list filters before store access. */
export const parseSquadGroupListFilters = Effect.fn(
  "SquadGroupListFilters.parse"
)(function* parseSquadGroupListFilters(
  input: ParseSquadGroupListFiltersInput = {}
) {
  const nameQuery = yield* parseNameQuery(input.nameQuery);
  const minLevel = yield* parseLevelBound(input.minLevel, "minLevel");
  const maxLevel = yield* parseLevelBound(input.maxLevel, "maxLevel");

  if (
    minLevel._tag === "Present" &&
    maxLevel._tag === "Present" &&
    minLevel.value > maxLevel.value
  ) {
    return yield* new InvalidSquadGroupLevelRange({
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

  return {
    levelRange,
    ...(nameQuery._tag === "Absent" ? {} : { nameQuery: nameQuery.value }),
  };
});

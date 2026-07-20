import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";

/** Policy for squad group browsing filters. */
export const squadGroupListFilterPolicy = {
  defaultLimit: 50,
  maxAllowedLevel: 500,
  minAllowedLevel: 1,
  nameQueryMaxLength: 80,
  nameQueryMinLength: 2,
} as const;

const normalizeNameQuery = (value: string): string =>
  value.trim().replaceAll(/\s+/gu, " ");

/** Normalized text query for browsing squad groups. */
export const SquadGroupNameQuery = Schema.String.pipe(
  Schema.decode({
    decode: SchemaGetter.transform(normalizeNameQuery),
    encode: SchemaGetter.passthrough(),
  }),
  Schema.check(
    Schema.isLengthBetween(
      squadGroupListFilterPolicy.nameQueryMinLength,
      squadGroupListFilterPolicy.nameQueryMaxLength
    )
  ),
  Schema.brand("SquadGroupNameQuery")
);
export type SquadGroupNameQuery = typeof SquadGroupNameQuery.Type;

/** Inclusive character-level bound for browsing squad groups. */
export const SquadGroupLevelBound = Schema.Int.pipe(
  Schema.check(
    Schema.isBetween({
      maximum: squadGroupListFilterPolicy.maxAllowedLevel,
      minimum: squadGroupListFilterPolicy.minAllowedLevel,
    })
  ),
  Schema.brand("SquadGroupLevelBound")
);
export type SquadGroupLevelBound = typeof SquadGroupLevelBound.Type;

/** Character-level range for squad group list filtering. */
export type SquadGroupLevelRange = Data.TaggedEnum<{
  readonly AnyLevel: Record<never, never>;
  readonly BoundedLevelRange: {
    readonly minLevel?: SquadGroupLevelBound;
    readonly maxLevel?: SquadGroupLevelBound;
  };
}>;
export const SquadGroupLevelRange = Data.taggedEnum<SquadGroupLevelRange>();

/** Parsed filters for squad group browsing lists. */
export interface SquadGroupListFilters {
  readonly nameQuery?: SquadGroupNameQuery;
  readonly levelRange: SquadGroupLevelRange;
}

/** Empty squad group list filters matching the unfiltered list behavior. */
export const emptySquadGroupListFilters: SquadGroupListFilters = {
  levelRange: SquadGroupLevelRange.AnyLevel(),
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

type ParsedNameQuery = Data.TaggedEnum<{
  readonly Absent: Record<never, never>;
  readonly Present: { readonly value: SquadGroupNameQuery };
}>;
const ParsedNameQuery = Data.taggedEnum<ParsedNameQuery>();

const parseNameQuery = Effect.fnUntraced(function* parseNameQuery(
  value: string | null | undefined
): Effect.fn.Return<ParsedNameQuery, InvalidSquadGroupNameQuery> {
  if (value === undefined || value === null) {
    return ParsedNameQuery.Absent();
  }

  const normalized = normalizeNameQuery(value);
  if (normalized.length === 0) {
    return ParsedNameQuery.Absent();
  }

  return ParsedNameQuery.Present({
    value: yield* Schema.decodeUnknownEffect(SquadGroupNameQuery)(value).pipe(
      Effect.catchTag(
        "SchemaError",
        () =>
          new InvalidSquadGroupNameQuery({
            message:
              normalized.length < squadGroupListFilterPolicy.nameQueryMinLength
                ? `Wpisz co najmniej ${squadGroupListFilterPolicy.nameQueryMinLength} znaki nazwy składu.`
                : `Nazwa składu może mieć maksymalnie ${squadGroupListFilterPolicy.nameQueryMaxLength} znaków.`,
          })
      )
    ),
  });
});

type ParsedLevelBound = Data.TaggedEnum<{
  readonly Absent: Record<never, never>;
  readonly Present: { readonly value: SquadGroupLevelBound };
}>;
const ParsedLevelBound = Data.taggedEnum<ParsedLevelBound>();

const parseLevelBound = Effect.fnUntraced(function* parseLevelBound(
  value: number | null | undefined,
  fieldName: "minLevel" | "maxLevel"
): Effect.fn.Return<ParsedLevelBound, InvalidSquadGroupLevelRange> {
  if (value === undefined || value === null) {
    return ParsedLevelBound.Absent();
  }

  return ParsedLevelBound.Present({
    value: yield* Schema.decodeUnknownEffect(SquadGroupLevelBound)(value).pipe(
      Effect.catchTag(
        "SchemaError",
        () =>
          new InvalidSquadGroupLevelRange({
            message: Number.isInteger(value)
              ? `Poziom ${fieldName === "minLevel" ? "od" : "do"} musi być w zakresie ${squadGroupListFilterPolicy.minAllowedLevel}-${squadGroupListFilterPolicy.maxAllowedLevel}.`
              : "Poziom postaci musi być liczbą całkowitą.",
          })
      )
    ),
  });
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
      ? SquadGroupLevelRange.AnyLevel()
      : SquadGroupLevelRange.BoundedLevelRange({
          ...(maxLevel._tag === "Absent" ? {} : { maxLevel: maxLevel.value }),
          ...(minLevel._tag === "Absent" ? {} : { minLevel: minLevel.value }),
        });

  return {
    levelRange,
    ...(nameQuery._tag === "Absent" ? {} : { nameQuery: nameQuery.value }),
  };
});

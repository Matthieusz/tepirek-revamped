import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const POSITIVE_INTEGER_TEXT = /^[1-9]\d*$/u;

const PositiveIntegerIdFromString = Schema.FiniteFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0))
);

export const validateSquadFilterLevelOrder = (values: {
  readonly maxLevel: string;
  readonly minLevel: string;
}): true | { readonly issue: string; readonly path: readonly ["maxLevel"] } => {
  const minLevel = values.minLevel.trim();
  const maxLevel = values.maxLevel.trim();
  const parsedMinLevel = Schema.decodeUnknownOption(
    PositiveIntegerIdFromString
  )(minLevel);
  const parsedMaxLevel = Schema.decodeUnknownOption(
    PositiveIntegerIdFromString
  )(maxLevel);

  if (
    Option.isSome(parsedMinLevel) &&
    Option.isSome(parsedMaxLevel) &&
    parsedMinLevel.value > parsedMaxLevel.value
  ) {
    return {
      issue: "Poziom od nie może być większy niż poziom do",
      path: ["maxLevel"],
    };
  }

  return true;
};

export const SquadFilterNameSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.length <= 80, {
    message: "Nazwa składu może mieć maksymalnie 80 znaków",
  }),
  Schema.refine((value): value is string => value.trim().length !== 1, {
    message: "Wpisz co najmniej 2 znaki nazwy składu",
  })
);

export const OptionalLevelSchema = Schema.String.pipe(
  Schema.refine(
    (value): value is string =>
      value.trim().length === 0 || POSITIVE_INTEGER_TEXT.test(value.trim()),
    { message: "Podaj poziom jako liczbę całkowitą większą od 0" }
  )
);

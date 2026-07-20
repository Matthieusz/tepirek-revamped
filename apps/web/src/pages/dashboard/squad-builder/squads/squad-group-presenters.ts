import * as Arr from "effect/Array";
import * as Str from "effect/String";

export const userInitials = (name: string): string =>
  Arr.join(
    Arr.map(
      Arr.take(Arr.filter(Str.split(name, /\s+/u), Str.isNonEmpty), 2),
      (part) => part[0]?.toUpperCase() ?? ""
    ),
    ""
  );

const pluralize = (
  count: number,
  singular: string,
  few: string,
  many: string
): string => {
  if (count === 1) {
    return singular;
  }
  if (count < 5) {
    return few;
  }
  return many;
};

export const formatCharacterCount = (count: number): string =>
  `${count} ${pluralize(count, "postać", "postacie", "postaci")}`;

export const formatSquadCount = (count: number): string =>
  `${count} ${pluralize(count, "skład", "składy", "składów")}`;

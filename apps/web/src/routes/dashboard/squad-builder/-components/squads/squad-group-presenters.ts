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

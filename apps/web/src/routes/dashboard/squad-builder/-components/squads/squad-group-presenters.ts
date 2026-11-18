const pluralize = (
  count: number,
  singular: string,
  few: string,
  many: string
) => {
  if (count === 1) {
    return singular;
  }

  if (count < 5) {
    return few;
  }

  return many;
};

export const formatCharacterCount = (count: number) =>
  `${count} ${pluralize(count, "postać", "postacie", "postaci")}`;

export const formatSquadCount = (count: number) =>
  `${count} ${pluralize(count, "skład", "składy", "składów")}`;

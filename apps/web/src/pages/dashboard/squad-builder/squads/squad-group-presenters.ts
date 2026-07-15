export const userInitials = (name: string): string =>
  name
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

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

const htmlEntityPattern = /&(?:amp|apos|gt|lt|nbsp|quot|#\d+|#x[\da-f]+);/giu;
const htmlTagPattern = /<[^>]*>/gu;
const maximumUnicodeCodePoint = 1_114_111;
const namedHtmlEntities = new Map([
  ["amp", "&"],
  ["apos", "'"],
  ["gt", ">"],
  ["lt", "<"],
  ["nbsp", " "],
  ["quot", '"'],
]);

/** Decode the HTML entities used by Margonem forum attributes and text. */
export const decodeMargonemForumHtmlEntities = (value: string): string =>
  value.replaceAll(htmlEntityPattern, (entity) => {
    const entityName = entity.slice(1, -1).toLowerCase();
    const namedEntity = namedHtmlEntities.get(entityName);
    if (namedEntity !== undefined) {
      return namedEntity;
    }

    const codePoint = entityName.startsWith("#x")
      ? Number.parseInt(entityName.slice(2), 16)
      : Number(entityName.slice(1));
    return Number.isSafeInteger(codePoint) &&
      codePoint >= 0 &&
      codePoint <= maximumUnicodeCodePoint
      ? String.fromCodePoint(codePoint)
      : entity;
  });

/** Extract a quoted or unquoted HTML attribute without trusting its contents. */
export const extractMargonemForumAttribute = (
  html: string,
  attribute: string
): string | undefined => {
  const pattern = new RegExp(
    `\\b${attribute}\\s*=\\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)'|(?<unquoted>[^\\s>]+))`,
    "iu"
  );
  const match = pattern.exec(html);
  return (
    match?.groups?.double ?? match?.groups?.single ?? match?.groups?.unquoted
  );
};

/** Remove markup and normalize visible text from a small HTML fragment. */
export const extractMargonemForumText = (value: string): string =>
  decodeMargonemForumHtmlEntities(value.replaceAll(htmlTagPattern, " "))
    .replaceAll(/\s+/gu, " ")
    .trim();

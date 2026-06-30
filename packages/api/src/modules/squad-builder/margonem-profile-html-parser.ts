import { parseMargonemProfession } from "./margonem-character";
import type { MargonemCharacterPreview } from "./margonem-character";
import {
  parseMargonemCharacterId,
  parsePositiveLevel,
} from "./margonem-profile-id";
import type { MargonemProfileId } from "./margonem-profile-id";
import { err, isError, ok } from "./result";
import type { Result } from "./result";

/** Parsed Jaruna-only Margonem profile data from Firecrawl HTML. */
export interface ParsedMargonemProfile {
  readonly profileId: MargonemProfileId;
  readonly suggestedAccountName: string;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Input for parsing Firecrawl HTML output. */
export interface ParseMargonemProfileHtmlInput {
  readonly profileId: MargonemProfileId;
  readonly html: string;
}

/** Expected failure when Margonem profile HTML does not match the supported shape. */
export type ParseMargonemProfileHtmlError =
  | {
      readonly _tag: "MargonemProfileNameNotFound";
      readonly profileId: MargonemProfileId;
    }
  | {
      readonly _tag: "MargonemCharacterRowsNotFound";
      readonly profileId: MargonemProfileId;
    }
  | {
      readonly _tag: "MargonemCharacterRowInvalid";
      readonly profileId: MargonemProfileId;
      readonly safeReason: string;
    };

const profileNamePattern =
  /profile-header__name[\s\S]*?<span>\s*(?<name>[^<]+?)\s*<\/span>/u;
const characterRowPattern =
  /<li\b[^>]*class="[^"]*\bchar-row\b[^"]*"[^>]*>[\s\S]*?<\/li>/gu;
const backgroundImagePattern =
  /background-image:\s*url\(['"]?(?<avatarUrl>[^'")]+)['"]?\)/u;

const decodeHtmlEntities = (value: string): string =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll(/&#(?<codePoint>\d+);/gu, (_match, codePoint: string) =>
      String.fromCodePoint(Number(codePoint))
    );

const stripTags = (value: string): string => value.replaceAll(/<[^>]*>/gu, "");

const extractAttribute = (
  html: string,
  attribute: string
): string | undefined => {
  const pattern = new RegExp(`${attribute}="(?<value>[^"]*)"`, "u");
  return pattern.exec(html)?.groups?.value;
};

const extractProfileName = (html: string): string | undefined => {
  const name = profileNamePattern.exec(html)?.groups?.name?.trim();
  return name === undefined || name.length === 0
    ? undefined
    : decodeHtmlEntities(name);
};

const extractProfessionLabel = (rowHtml: string): string | undefined => {
  const match =
    /<span\b[^>]*class="[^"]*\bcharacter-prof\b[^"]*"[^>]*>(?<profession>[\s\S]*?)<\/span>/u.exec(
      rowHtml
    );
  const text = match?.groups?.profession;

  if (text === undefined) {
    return undefined;
  }

  const stripped = stripTags(text).trim();
  return stripped.length === 0 ? undefined : decodeHtmlEntities(stripped);
};

const extractAvatarUrl = (rowHtml: string): string | null => {
  const match = backgroundImagePattern.exec(rowHtml);
  const avatarUrl = match?.groups?.avatarUrl?.trim();
  return avatarUrl === undefined || avatarUrl.length === 0 ? null : avatarUrl;
};

const parseJarunaCharacterRow = (
  profileId: MargonemProfileId,
  rowHtml: string
): Result<MargonemCharacterPreview | null, ParseMargonemProfileHtmlError> => {
  const world = extractAttribute(rowHtml, "data-world");

  if (world !== "#jaruna") {
    return ok(null);
  }

  const characterIdText = extractAttribute(rowHtml, "data-id");
  const name = extractAttribute(rowHtml, "data-nick");
  const levelText = extractAttribute(rowHtml, "data-lvl");
  const professionLabel = extractProfessionLabel(rowHtml);

  if (
    characterIdText === undefined ||
    name === undefined ||
    levelText === undefined
  ) {
    return err({
      _tag: "MargonemCharacterRowInvalid",
      profileId,
      safeReason: "missing required character row attributes",
    });
  }

  if (professionLabel === undefined) {
    return err({
      _tag: "MargonemCharacterRowInvalid",
      profileId,
      safeReason: "missing profession label",
    });
  }

  const characterId = parseMargonemCharacterId(Number(characterIdText));
  const level = parsePositiveLevel(Number(levelText));
  const profession = parseMargonemProfession(professionLabel);

  if (isError(characterId)) {
    return err({
      _tag: "MargonemCharacterRowInvalid",
      profileId,
      safeReason: "invalid character id",
    });
  }

  if (isError(level)) {
    return err({
      _tag: "MargonemCharacterRowInvalid",
      profileId,
      safeReason: "invalid character level",
    });
  }

  if (isError(profession)) {
    return err({
      _tag: "MargonemCharacterRowInvalid",
      profileId,
      safeReason: "unknown profession label",
    });
  }

  return ok({
    avatarUrl: extractAvatarUrl(rowHtml),
    characterId: characterId.value,
    level: level.value,
    name: decodeHtmlEntities(name.trim()),
    profession: profession.value,
    world: "jaruna",
  });
};

/** Parse Firecrawl HTML into a Jaruna-only profile preview. */
export const parseMargonemProfileHtml = ({
  html,
  profileId,
}: ParseMargonemProfileHtmlInput): Result<
  ParsedMargonemProfile,
  ParseMargonemProfileHtmlError
> => {
  const suggestedAccountName = extractProfileName(html);

  if (suggestedAccountName === undefined) {
    return err({ _tag: "MargonemProfileNameNotFound", profileId });
  }

  const rowMatches = Array.from(
    html.matchAll(characterRowPattern),
    (match) => match[0]
  );

  if (rowMatches.length === 0) {
    return err({ _tag: "MargonemCharacterRowsNotFound", profileId });
  }

  const jarunaCharacters: MargonemCharacterPreview[] = [];

  for (const rowHtml of rowMatches) {
    const parsedCharacter = parseJarunaCharacterRow(profileId, rowHtml);

    if (isError(parsedCharacter)) {
      return err(parsedCharacter.error);
    }

    if (parsedCharacter.value !== null) {
      jarunaCharacters.push(parsedCharacter.value);
    }
  }

  return ok({
    jarunaCharacters,
    profileId,
    suggestedAccountName,
  });
};

import * as Effect from "effect/Effect";

import { parseMargonemProfession } from "./margonem-character.js";
import type { MargonemCharacterPreview } from "./margonem-character.js";
import {
  parseMargonemCharacterId,
  parsePositiveLevel,
} from "./margonem-profile-id.js";
import type { MargonemProfileId } from "./margonem-profile-id.js";

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
): Effect.Effect<
  MargonemCharacterPreview | null,
  ParseMargonemProfileHtmlError
> => {
  const world = extractAttribute(rowHtml, "data-world");

  if (world !== "#jaruna") {
    return Effect.succeed(null);
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
    return Effect.fail({
      _tag: "MargonemCharacterRowInvalid",
      profileId,
      safeReason: "missing required character row attributes",
    });
  }

  if (professionLabel === undefined) {
    return Effect.fail({
      _tag: "MargonemCharacterRowInvalid",
      profileId,
      safeReason: "missing profession label",
    });
  }

  let parsedCharacterId: MargonemCharacterId;
  let parsedLevel: PositiveLevel;
  let parsedProfession: MargonemProfession;

  try {
    parsedCharacterId = Effect.runSync(
      parseMargonemCharacterId(Number(characterIdText))
    );
    parsedLevel = Effect.runSync(parsePositiveLevel(Number(levelText)));
    parsedProfession = Effect.runSync(parseMargonemProfession(professionLabel));
  } catch {
    return Effect.fail({
      _tag: "MargonemCharacterRowInvalid",
      profileId,
      safeReason: "invalid character attributes",
    });
  }

  return Effect.succeed({
    avatarUrl: extractAvatarUrl(rowHtml),
    characterId: parsedCharacterId,
    level: parsedLevel,
    name: decodeHtmlEntities(name.trim()),
    profession: parsedProfession,
    world: "jaruna",
  });
};

/** Parse Firecrawl HTML into a Jaruna-only profile preview. */
export const parseMargonemProfileHtml = ({
  html,
  profileId,
}: ParseMargonemProfileHtmlInput): Effect.Effect<
  ParsedMargonemProfile,
  ParseMargonemProfileHtmlError
> => {
  const suggestedAccountName = extractProfileName(html);

  if (suggestedAccountName === undefined) {
    return Effect.fail({ _tag: "MargonemProfileNameNotFound", profileId });
  }

  const rowMatches = Array.from(
    html.matchAll(characterRowPattern),
    (match) => match[0]
  );

  if (rowMatches.length === 0) {
    return Effect.fail({ _tag: "MargonemCharacterRowsNotFound", profileId });
  }

  const jarunaCharacters: MargonemCharacterPreview[] = [];

  for (const rowHtml of rowMatches) {
    try {
      const parsedCharacter = Effect.runSync(
        parseJarunaCharacterRow(profileId, rowHtml)
      );
      if (parsedCharacter !== null) {
        jarunaCharacters.push(parsedCharacter);
      }
    } catch (error) {
      return Effect.fail(error as ParseMargonemProfileHtmlError);
    }
  }

  return Effect.succeed({
    jarunaCharacters,
    profileId,
    suggestedAccountName,
  });
};

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { parseMargonemProfession } from "./margonem-character.ts";
import type { MargonemCharacterPreview } from "./margonem-character.ts";
import {
  MargonemProfileId,
  parseMargonemCharacterId,
  parsePositiveLevel,
} from "./margonem-profile-id.ts";

// oxlint-disable max-classes-per-file -- closely related parser error variants share one boundary.

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

/** Expected failure when a supported profile header has no account name. */
export class MargonemProfileNameNotFound extends Schema.TaggedErrorClass<MargonemProfileNameNotFound>()(
  "MargonemProfileNameNotFound",
  { profileId: MargonemProfileId }
) {}

/** Expected failure when the profile has no character rows. */
export class MargonemCharacterRowsNotFound extends Schema.TaggedErrorClass<MargonemCharacterRowsNotFound>()(
  "MargonemCharacterRowsNotFound",
  { profileId: MargonemProfileId }
) {}

/** Expected failure when a Jaruna character row has invalid attributes. */
export class MargonemCharacterRowInvalid extends Schema.TaggedErrorClass<MargonemCharacterRowInvalid>()(
  "MargonemCharacterRowInvalid",
  {
    profileId: MargonemProfileId,
    safeReason: Schema.String,
  }
) {}

/** Expected failure when Margonem profile HTML does not match the supported shape. */
export type ParseMargonemProfileHtmlError =
  | MargonemProfileNameNotFound
  | MargonemCharacterRowsNotFound
  | MargonemCharacterRowInvalid;

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

const parseJarunaCharacterRow = Effect.fnUntraced(
  function* parseJarunaCharacterRow(
    profileId: MargonemProfileId,
    rowHtml: string
  ): Effect.fn.Return<
    MargonemCharacterPreview | null,
    ParseMargonemProfileHtmlError
  > {
    const world = extractAttribute(rowHtml, "data-world");

    if (world !== "#jaruna") {
      return null;
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
      return yield* new MargonemCharacterRowInvalid({
        profileId,
        safeReason: "missing required character row attributes",
      });
    }

    if (professionLabel === undefined) {
      return yield* new MargonemCharacterRowInvalid({
        profileId,
        safeReason: "missing profession label",
      });
    }

    const invalidCharacter = () =>
      new MargonemCharacterRowInvalid({
        profileId,
        safeReason: "invalid character attributes",
      });
    const parsedCharacterId = yield* parseMargonemCharacterId(
      Number(characterIdText)
    ).pipe(Effect.mapError(invalidCharacter));
    const parsedLevel = yield* parsePositiveLevel(Number(levelText)).pipe(
      Effect.mapError(invalidCharacter)
    );
    const parsedProfession = yield* parseMargonemProfession(
      professionLabel
    ).pipe(Effect.mapError(invalidCharacter));

    return {
      avatarUrl: extractAvatarUrl(rowHtml),
      characterId: parsedCharacterId,
      level: parsedLevel,
      name: decodeHtmlEntities(name.trim()),
      profession: parsedProfession,
      world: "jaruna" as const,
    };
  }
);

/** Parse Firecrawl HTML into a Jaruna-only profile preview. */
export const parseMargonemProfileHtml = Effect.fnUntraced(
  function* parseMargonemProfileHtml({
    html,
    profileId,
  }: ParseMargonemProfileHtmlInput): Effect.fn.Return<
    ParsedMargonemProfile,
    ParseMargonemProfileHtmlError
  > {
    const suggestedAccountName = extractProfileName(html);

    if (suggestedAccountName === undefined) {
      return yield* new MargonemProfileNameNotFound({ profileId });
    }

    const rowMatches = Array.from(
      html.matchAll(characterRowPattern),
      (match) => match[0]
    );

    if (rowMatches.length === 0) {
      return yield* new MargonemCharacterRowsNotFound({ profileId });
    }

    const jarunaCharacters: MargonemCharacterPreview[] = [];

    for (const rowHtml of rowMatches) {
      const parsedCharacter = yield* parseJarunaCharacterRow(
        profileId,
        rowHtml
      );
      if (parsedCharacter !== null) {
        jarunaCharacters.push(parsedCharacter);
      }
    }

    return {
      jarunaCharacters,
      profileId,
      suggestedAccountName,
    };
  }
);

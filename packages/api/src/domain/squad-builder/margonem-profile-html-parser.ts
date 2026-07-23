import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
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
  /background-image:\s*url\(\s*(?<avatarUrl>[^)]*?)\s*\)/u;

const decodeNumber = Schema.decodeUnknownEffect(Schema.FiniteFromString);
const numericHtmlEntityPattern = /&#(?<codePoint>[^;]*);/gu;
const maximumUnicodeCodePoint = 0x10_ff_ff;

const decodeHtmlEntities = <Error>(
  value: string,
  onInvalidEntity: () => Error
): Effect.Effect<string, Error> =>
  Effect.gen(function* decodeEntities() {
    const withNamedEntitiesDecoded = value
      .replaceAll("&amp;", "&")
      .replaceAll("&quot;", '"')
      .replaceAll("&#039;", "'")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">");
    const decodedParts: string[] = [];
    let previousEnd = 0;

    for (const match of withNamedEntitiesDecoded.matchAll(
      numericHtmlEntityPattern
    )) {
      const codePointText = match.groups?.codePoint;
      const matchIndex = match.index;

      if (codePointText === undefined) {
        return yield* Effect.fail(onInvalidEntity());
      }

      const codePoint = yield* decodeNumber(codePointText).pipe(
        Effect.filterOrFail(
          (number) =>
            Number.isInteger(number) &&
            number >= 0 &&
            number <= maximumUnicodeCodePoint,
          onInvalidEntity
        ),
        Effect.mapError(onInvalidEntity)
      );

      decodedParts.push(
        withNamedEntitiesDecoded.slice(previousEnd, matchIndex),
        String.fromCodePoint(codePoint)
      );
      previousEnd = matchIndex + match[0].length;
    }

    decodedParts.push(withNamedEntitiesDecoded.slice(previousEnd));
    return decodedParts.join("");
  });

const stripTags = (value: string): string => value.replaceAll(/<[^>]*>/gu, "");

const extractAttribute = (
  html: string,
  attribute: string
): string | undefined => {
  const pattern = new RegExp(`${attribute}="(?<value>[^"]*)"`, "u");
  return pattern.exec(html)?.groups?.value;
};

const extractProfileName = (
  html: string,
  profileId: MargonemProfileId
): Effect.Effect<string | null, MargonemProfileNameNotFound> => {
  const name = profileNamePattern.exec(html)?.groups?.name?.trim();
  return name === undefined || name.length === 0
    ? Effect.succeed(null)
    : decodeHtmlEntities(
        name,
        () => new MargonemProfileNameNotFound({ profileId })
      );
};

const extractProfessionLabel = (
  rowHtml: string,
  onInvalidEntity: () => MargonemCharacterRowInvalid
): Effect.Effect<string | null, MargonemCharacterRowInvalid> => {
  const match =
    /<span\b[^>]*class="[^"]*\bcharacter-prof\b[^"]*"[^>]*>(?<profession>[\s\S]*?)<\/span>/u.exec(
      rowHtml
    );
  const text = match?.groups?.profession;

  if (text === undefined) {
    return Effect.succeed(null);
  }

  const stripped = stripTags(text).trim();
  return stripped.length === 0
    ? Effect.succeed(null)
    : decodeHtmlEntities(stripped, onInvalidEntity);
};

const extractAvatarUrl = (
  rowHtml: string,
  onInvalidEntity: () => MargonemCharacterRowInvalid
): Effect.Effect<string | null, MargonemCharacterRowInvalid> =>
  Effect.gen(function* decodeAvatarUrl() {
    const match = backgroundImagePattern.exec(rowHtml);
    const rawAvatarUrl = match?.groups?.avatarUrl;

    if (rawAvatarUrl === undefined) {
      return null;
    }

    const decodedAvatarUrl = (yield* decodeHtmlEntities(
      rawAvatarUrl,
      onInvalidEntity
    )).trim();
    const hasWrappingQuotes =
      (decodedAvatarUrl.startsWith('"') && decodedAvatarUrl.endsWith('"')) ||
      (decodedAvatarUrl.startsWith("'") && decodedAvatarUrl.endsWith("'"));
    const avatarUrl = hasWrappingQuotes
      ? decodedAvatarUrl.slice(1, -1).trim()
      : decodedAvatarUrl;

    return avatarUrl.length === 0 ? null : avatarUrl;
  });

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
    const invalidEntity = () =>
      new MargonemCharacterRowInvalid({
        profileId,
        safeReason: "invalid numeric HTML entity",
      });
    const professionLabel = yield* extractProfessionLabel(
      rowHtml,
      invalidEntity
    );

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

    if (professionLabel === null) {
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
    const characterId = yield* decodeNumber(characterIdText).pipe(
      Effect.mapError(invalidCharacter)
    );
    const level = yield* decodeNumber(levelText).pipe(
      Effect.mapError(invalidCharacter)
    );
    const parsedCharacterId = yield* parseMargonemCharacterId(characterId).pipe(
      Effect.mapError(invalidCharacter)
    );
    const parsedLevel = yield* parsePositiveLevel(level).pipe(
      Effect.mapError(invalidCharacter)
    );
    const parsedProfession = yield* parseMargonemProfession(
      professionLabel
    ).pipe(Effect.mapError(invalidCharacter));

    return {
      avatarUrl: yield* extractAvatarUrl(rowHtml, invalidEntity),
      characterId: parsedCharacterId,
      level: parsedLevel,
      name: yield* decodeHtmlEntities(name.trim(), invalidEntity),
      profession: parsedProfession,
      world: "jaruna" as const,
    };
  }
);

/** Parse Firecrawl HTML into a Jaruna-only profile preview. */
export const parseMargonemProfileHtml = Effect.fn("MargonemProfileHtml.parse")(
  function* parseMargonemProfileHtml({
    html,
    profileId,
  }: ParseMargonemProfileHtmlInput): Effect.fn.Return<
    ParsedMargonemProfile,
    ParseMargonemProfileHtmlError
  > {
    const suggestedAccountName = yield* extractProfileName(html, profileId);

    if (suggestedAccountName === null) {
      return yield* new MargonemProfileNameNotFound({ profileId });
    }

    const rowMatches = Arr.map(
      Arr.fromIterable(html.matchAll(characterRowPattern)),
      (match) => match[0]
    );

    if (rowMatches.length === 0) {
      return yield* new MargonemCharacterRowsNotFound({ profileId });
    }

    // oxlint-disable-next-line unicorn/no-array-for-each unicorn/no-array-method-this-argument -- Effect.forEach sequences typed effects; this is not Array#forEach.
    const parsedCharacters = yield* Effect.forEach(rowMatches, (rowHtml) =>
      parseJarunaCharacterRow(profileId, rowHtml)
    );
    // oxlint-disable-next-line unicorn/no-array-method-this-argument -- Effect Array.filter uses a data-first overload; the second argument is a predicate, not thisArg.
    const jarunaCharacters = Arr.filter(parsedCharacters, Predicate.isNotNull);

    return {
      jarunaCharacters,
      profileId,
      suggestedAccountName,
    };
  }
);

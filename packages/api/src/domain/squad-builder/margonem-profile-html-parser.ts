/* eslint-disable max-classes-per-file -- Profile parser errors form one closed error algebra. */
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import { parseHTML } from "linkedom";

import { parseMargonemProfession } from "./margonem-character.ts";
import type { MargonemCharacterPreview } from "./margonem-character.ts";
import {
  MargonemProfileId,
  parseMargonemCharacterId,
  parsePositiveLevel,
} from "./margonem-profile-id.ts";

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

/**
 * Values read from the DOM are untrusted even though the DOM implementation
 * gives them string types. Keep missing attributes explicit until validation
 * decides whether a row is supported.
 */
const RawMargonemCharacterRow = Schema.Struct({
  avatarUrl: Schema.NullOr(Schema.String),
  characterId: Schema.NullOr(Schema.String),
  level: Schema.NullOr(Schema.String),
  name: Schema.NullOr(Schema.String),
  profession: Schema.NullOr(Schema.String),
  world: Schema.NullOr(Schema.String),
});
type RawMargonemCharacterRow = typeof RawMargonemCharacterRow.Type;

const decodeRawCharacterRow = Schema.decodeUnknownEffect(
  RawMargonemCharacterRow
);
const decodeText = Schema.decodeUnknownEffect(Schema.String);
const decodeNumber = Schema.decodeUnknownEffect(Schema.FiniteFromString);

// linkedom turns invalid/out-of-range numeric entities into either literal text
// or U+FFFD. They must not be accepted as character data by the import flow.
const numericHtmlEntityPattern = /&#(?:[^;]*);/u;
const isMalformedHtmlText = (value: string): boolean =>
  value.includes("\uFFFD") || numericHtmlEntityPattern.test(value);

const decodeHtmlText = <Error>(
  value: string,
  onInvalidText: () => Error
): Effect.Effect<string, Error> =>
  Effect.gen(function* decodeTextValue() {
    const text = yield* decodeText(value).pipe(Effect.mapError(onInvalidText));
    if (isMalformedHtmlText(text)) {
      return yield* Effect.fail(onInvalidText());
    }
    return text;
  });

interface HtmlStyle {
  readonly getPropertyValue: (property: string) => string;
}

interface HtmlElement {
  readonly dataset?: Readonly<Record<string, string | undefined>>;
  readonly getAttribute: (name: string) => string | null;
  readonly querySelector: (selectors: string) => HtmlElement | null;
  readonly setAttribute: (name: string, value: string) => void;
  readonly style?: HtmlStyle;
  readonly textContent: string | null;
}

type ParsedDocument = ReturnType<typeof parseHTML>["document"];

const decodeCssTextWithHtmlParser = (value: string): string => {
  let decoded = value;
  // Firecrawl sometimes returns entities encoded twice in inline styles.
  // Parsing a text node, rather than replacing entity names, handles both
  // that input and the full entity set supported by the HTML parser.
  for (let pass = 0; pass < 2; pass += 1) {
    const parsed = parseHTML(`<span>${decoded}</span>`).document;
    const next = parsed.querySelector("span")?.textContent;
    if (next === undefined || next === decoded) {
      break;
    }
    decoded = next;
  }
  return decoded;
};

const extractBackgroundImageUrl = (row: HtmlElement): string | null => {
  const image = row.querySelector(".cimg");
  const style = image?.getAttribute("style");
  if (
    image === null ||
    image === undefined ||
    style === null ||
    style === undefined
  ) {
    return null;
  }

  // Let the DOM implementation parse the CSS declaration as well as the HTML.
  image.setAttribute("style", decodeCssTextWithHtmlParser(style));
  const backgroundImage = image.style?.getPropertyValue("background-image");
  if (
    backgroundImage === undefined ||
    !backgroundImage.startsWith("url(") ||
    !backgroundImage.endsWith(")")
  ) {
    return null;
  }

  const value = backgroundImage.slice(4, -1).trim();
  const hasWrappingQuotes =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  const url = hasWrappingQuotes ? value.slice(1, -1).trim() : value;
  return url.length === 0 ? null : url;
};

const readRawCharacterRow = (row: HtmlElement): RawMargonemCharacterRow => ({
  avatarUrl: extractBackgroundImageUrl(row),
  characterId: row.dataset?.id ?? null,
  level: row.dataset?.lvl ?? null,
  name: row.dataset?.nick ?? null,
  profession: row.querySelector(".character-prof")?.textContent?.trim() ?? null,
  world: row.dataset?.world ?? null,
});

const extractProfileName = (
  document: ParsedDocument,
  profileId: MargonemProfileId
): Effect.Effect<string | null, MargonemProfileNameNotFound> =>
  Effect.gen(function* findProfileName() {
    const name = document
      .querySelector(".profile-header__name span")
      ?.textContent?.trim();
    if (name === undefined || name.length === 0) {
      return null;
    }

    return yield* decodeHtmlText(
      name,
      () => new MargonemProfileNameNotFound({ profileId })
    );
  });

const parseJarunaCharacterRow = Effect.fnUntraced(
  function* parseJarunaCharacterRow(
    profileId: MargonemProfileId,
    row: HtmlElement
  ): Effect.fn.Return<
    MargonemCharacterPreview | null,
    ParseMargonemProfileHtmlError
  > {
    const raw = yield* decodeRawCharacterRow(readRawCharacterRow(row)).pipe(
      Effect.mapError(
        () =>
          new MargonemCharacterRowInvalid({
            profileId,
            safeReason: "malformed character row",
          })
      )
    );

    // Other worlds are valid records, but are intentionally not part of the
    // Jaruna-only import. Keeping this branch after schema decoding prevents
    // malformed/unknown records from being mistaken for valid characters.
    if (raw.world !== "#jaruna") {
      return null;
    }

    const invalidEntity = () =>
      new MargonemCharacterRowInvalid({
        profileId,
        safeReason: "invalid numeric HTML entity",
      });
    const invalidCharacter = () =>
      new MargonemCharacterRowInvalid({
        profileId,
        safeReason: "invalid character attributes",
      });

    if (raw.characterId === null || raw.name === null || raw.level === null) {
      return yield* new MargonemCharacterRowInvalid({
        profileId,
        safeReason: "missing required character row attributes",
      });
    }

    const professionLabel = raw.profession;
    if (professionLabel === null || professionLabel.length === 0) {
      return yield* new MargonemCharacterRowInvalid({
        profileId,
        safeReason: "missing profession label",
      });
    }

    const characterId = yield* decodeNumber(raw.characterId).pipe(
      Effect.mapError(invalidCharacter)
    );
    const level = yield* decodeNumber(raw.level).pipe(
      Effect.mapError(invalidCharacter)
    );
    const parsedCharacterId = yield* parseMargonemCharacterId(characterId).pipe(
      Effect.mapError(invalidCharacter)
    );
    const parsedLevel = yield* parsePositiveLevel(level).pipe(
      Effect.mapError(invalidCharacter)
    );
    const parsedProfession = yield* parseMargonemProfession(
      yield* decodeHtmlText(professionLabel, invalidEntity)
    ).pipe(Effect.mapError(invalidCharacter));

    return {
      avatarUrl:
        raw.avatarUrl === null
          ? null
          : yield* decodeHtmlText(raw.avatarUrl, invalidEntity).pipe(
              Effect.map((value) =>
                value.trim().length === 0 ? null : value.trim()
              )
            ),
      characterId: parsedCharacterId,
      level: parsedLevel,
      name: yield* decodeHtmlText(raw.name.trim(), invalidEntity),
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
    const { document } = parseHTML(html);
    const suggestedAccountName = yield* extractProfileName(document, profileId);

    if (suggestedAccountName === null) {
      return yield* new MargonemProfileNameNotFound({ profileId });
    }

    const rowElements: readonly HtmlElement[] = Arr.fromIterable(
      document.querySelectorAll(".char-row")
    );
    if (rowElements.length === 0) {
      return yield* new MargonemCharacterRowsNotFound({ profileId });
    }

    // oxlint-disable-next-line unicorn/no-array-for-each unicorn/no-array-method-this-argument -- Effect.forEach sequences typed effects; this is not Array#forEach.
    const parsedCharacters = yield* Effect.forEach(rowElements, (row) =>
      parseJarunaCharacterRow(profileId, row)
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

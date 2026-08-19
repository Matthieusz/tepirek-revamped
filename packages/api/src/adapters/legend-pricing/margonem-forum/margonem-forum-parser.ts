/* eslint-disable max-classes-per-file -- Forum parser data and its typed error share one boundary. */
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import {
  classifyLegendaryEquipment,
  LegendaryBonus,
  LegendaryEnemyLevel,
  LegendaryItemLevel,
  MargonemForumPostId,
  normalizeLegendaryEnemyIcon,
  normalizeLegendaryItemIcon,
} from "../../../domain/legend-pricing/legend-catalog.ts";
import type {
  LegendaryEnemyCategory,
  LegendaryEnemySourceKey,
  LegendaryEquipmentType,
  LegendaryItemSourceKey,
  LegendaryProfession,
  MargonemCdnIconUrl,
} from "../../../domain/legend-pricing/legend-catalog.ts";
import type { MargonemForumTopicPage } from "./margonem-forum-client.ts";
import {
  decodeMargonemForumHtmlEntities,
  extractMargonemForumAttribute,
  extractMargonemForumText,
} from "./margonem-forum-html.ts";

const OFFICIAL_PROFILE_ID = 7_798_898;
const OFFICIAL_AUTHOR = "Ekipa Garmory";
const postStartPattern =
  /<tr\s*>\s*<td\s+class=(?:"[^"]*\bpuser\b[^"]*"|'[^']*\bpuser\b[^']*'|[^\s>]*\bpuser\b[^\s>]*)[^>]*>\s*<a\s+name=["']?post(?<id>\d+)["']?/giu;
const imagePattern = /<img\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/giu;
const itemTemplatePattern =
  /<b\b[^>]*>\s*Szablon zdobyczy\s*:?\s*<\/b\s*>\s*:?/iu;
const indirectLootPattern =
  /Za\s+pośrednictwem\s+przedmiotu\s+pozyskanego\s+z\s+(?<source>[\s\S]*?),\s*wchodząc\s+w\s+interakcję\s+z\s+[\s\S]*?\s+można\s+zdobyć\s*:/iu;
const postContentPattern =
  /<td\s+class=["']?pcont["']?[^>]*>(?<content>[\s\S]*?)(?=<tr\s*>\s*<td\s+class=(?:["']?postid\b))/iu;
const editedAtPattern =
  /Edytowany\s+(?<value>\d{1,2}:\d{2}:\d{2}\s+\d{1,2}\.\d{1,2}\.\d{4})\s+przez/iu;
const profilePattern =
  /https:\/\/www\.margonem\.pl\/profile\/view,(?<id>\d+)/iu;
const officialBadgePattern =
  /<img\b[^>]*src=["']?(?:https:\/\/forum\.margonem\.pl)?\/img\/forum-mg-new\.png["']?[^>]*>/iu;
const officialAuthorPattern =
  /<div\s+class=["']?nickwood["']?[^>]*>[\s\S]*?<h3\b[^>]*>(?<author>[\s\S]*?)<\/h3\s*>/iu;
const staffPostPattern =
  /<td\s+class=(?:"[^"]*\bpuser\b[^"]*\bmod\b[^"]*"|'[^']*\bpuser\b[^']*\bmod\b[^']*'|[^\s>]*\bpuser\b[^\s>]*\bmod\b)[^>]*>/iu;
const itemClassPattern = /^\d+$/u;
const headingWithProfessionPattern =
  /^(?<name>.+?)(?:\s*-\s*|\s+)(?<profession>Tancerz\s+Ostrzy|Wojownik|Paladyn|Mag|Łowca|Tropiciel)\s*,\s*(?<level>\d+)\s*lvl(?:\s*\|.*)?$/iu;
const headingWithoutProfessionPattern =
  /^(?<name>.+?)\s*-?\s*(?<level>\d+)\s*lvl(?:\s*\|.*)?$/iu;

/** A key/value pair decoded from a forum item `stats` attribute. */
interface MargonemForumItemStat {
  readonly key: string;
  readonly value: string | null;
}

/** Legendary equipment metadata parsed from an official forum guide. */
export interface MargonemForumLegendaryItem {
  readonly equipmentType: LegendaryEquipmentType;
  readonly iconUrl: MargonemCdnIconUrl;
  readonly legendaryBonus: LegendaryBonus | null;
  readonly level: LegendaryItemLevel;
  readonly name: string;
  readonly professions: readonly LegendaryProfession[];
  readonly sourceIconKey: LegendaryItemSourceKey;
  readonly statAttributes: readonly MargonemForumItemStat[];
}

/** A complete current enemy entry parsed from an official forum guide. */
interface MargonemForumEnemy {
  readonly category: LegendaryEnemyCategory;
  readonly iconUrl: MargonemCdnIconUrl;
  readonly level: LegendaryEnemyLevel;
  readonly name: string;
  readonly profession: LegendaryProfession | null;
  readonly sourceIconKey: LegendaryEnemySourceKey;
  readonly sourcePostId: MargonemForumPostId;
  readonly sourceUrl: string;
}

/** A parsed item-to-enemy relation expressed with forum source identities. */
interface MargonemForumDrop {
  readonly enemyCategory: LegendaryEnemyCategory;
  readonly enemySourceIconKey: LegendaryEnemySourceKey;
  readonly itemSourceIconKey: LegendaryItemSourceKey;
}

/** Source post metadata retained for synchronization diagnostics. */
interface MargonemForumSourcePost {
  readonly category: LegendaryEnemyCategory;
  readonly editedAt: string | null;
  readonly postId: MargonemForumPostId;
}

/** A complete parsed snapshot from one official Margonem forum topic. */
export interface MargonemForumCatalogSnapshot {
  readonly drops: readonly MargonemForumDrop[];
  readonly enemies: readonly MargonemForumEnemy[];
  readonly items: readonly MargonemForumLegendaryItem[];
  readonly sourcePosts: readonly MargonemForumSourcePost[];
}

/** The forum topic cannot be safely interpreted as a complete official guide. */
export class MargonemForumGuideNotParseable extends Schema.TaggedErrorClass<MargonemForumGuideNotParseable>()(
  "MargonemForumGuideNotParseable",
  {
    category: Schema.Literals(["hero", "elite2"]),
    postId: Schema.optionalKey(MargonemForumPostId),
    reason: Schema.String,
  }
) {}

interface PostContainer {
  readonly html: string;
  readonly postId: MargonemForumPostId;
}

interface EnemyHeading {
  readonly level: LegendaryEnemyLevel;
  readonly name: string;
  readonly profession: LegendaryProfession | null;
}

interface EnemyMarker {
  readonly heading: EnemyHeading;
  readonly iconUrl: MargonemCdnIconUrl;
  readonly sourceIconKey: LegendaryEnemySourceKey;
  readonly start: number;
}

interface IndirectLoot {
  readonly items: readonly MargonemForumLegendaryItem[];
  readonly sourceEnemyName: string;
}

interface CatalogAccumulator {
  readonly dropKeys: Set<string>;
  readonly drops: MargonemForumDrop[];
  readonly itemBySourceKey: Map<
    LegendaryItemSourceKey,
    MargonemForumLegendaryItem
  >;
}

const professionByPolishName = new Map<string, LegendaryProfession>([
  ["tancerz ostrzy", "bladeDancer"],
  ["wojownik", "warrior"],
  ["paladyn", "paladin"],
  ["mag", "mage"],
  ["łowca", "hunter"],
  ["tropiciel", "tracker"],
]);

const professionByCode = new Map<string, LegendaryProfession>([
  ["b", "bladeDancer"],
  ["h", "hunter"],
  ["m", "mage"],
  ["p", "paladin"],
  ["t", "tracker"],
  ["w", "warrior"],
]);

const parseError = (
  category: LegendaryEnemyCategory,
  reason: string,
  postId?: MargonemForumPostId
): MargonemForumGuideNotParseable =>
  postId === undefined
    ? new MargonemForumGuideNotParseable({ category, reason })
    : new MargonemForumGuideNotParseable({ category, postId, reason });

const splitPostContainers = (html: string): readonly PostContainer[] => {
  const starts = [...html.matchAll(postStartPattern)];
  const posts: PostContainer[] = [];
  const seenPostIds = new Set<number>();

  for (const [index, match] of starts.entries()) {
    const idText = match.groups?.id;
    const start = match.index;
    if (idText === undefined || start === undefined) {
      continue;
    }

    const id = Number(idText);
    if (!Number.isSafeInteger(id) || id < 1 || seenPostIds.has(id)) {
      continue;
    }

    const end = starts[index + 1]?.index ?? html.length;
    seenPostIds.add(id);
    posts.push({
      html: html.slice(start, end),
      postId: MargonemForumPostId.make(id),
    });
  }

  return posts;
};

const extractPostContent = (postHtml: string): string | undefined =>
  postContentPattern.exec(postHtml)?.groups?.content;

const isOfficialPost = (postHtml: string): boolean => {
  const profileId = Number(profilePattern.exec(postHtml)?.groups?.id);
  const authorHtml = officialAuthorPattern.exec(postHtml)?.groups?.author;
  const author =
    authorHtml === undefined ? undefined : extractMargonemForumText(authorHtml);

  return (
    profileId === OFFICIAL_PROFILE_ID &&
    author === OFFICIAL_AUTHOR &&
    officialBadgePattern.test(postHtml) &&
    staffPostPattern.test(postHtml)
  );
};

const parseEnemyHeading = (value: string): EnemyHeading | undefined => {
  const normalized = value.replaceAll(/\s+/gu, " ").trim();
  const withProfession = headingWithProfessionPattern.exec(normalized);
  if (withProfession?.groups?.name && withProfession.groups.level) {
    const professionName = withProfession.groups.profession?.toLowerCase();
    const profession =
      professionName === undefined
        ? undefined
        : professionByPolishName.get(professionName);
    const level = Number(withProfession.groups.level);
    if (profession !== undefined && Number.isSafeInteger(level) && level > 0) {
      return {
        level: LegendaryEnemyLevel.make(level),
        name: withProfession.groups.name.trim(),
        profession,
      };
    }
  }

  const withoutProfession = headingWithoutProfessionPattern.exec(normalized);
  const name = withoutProfession?.groups?.name?.trim().replace(/\s*-\s*$/u, "");
  const level = Number(withoutProfession?.groups?.level);
  return name !== undefined &&
    name.length > 0 &&
    Number.isSafeInteger(level) &&
    level > 0
    ? {
        level: LegendaryEnemyLevel.make(level),
        name,
        profession: null,
      }
    : undefined;
};

const nearestHeading = (
  content: string,
  imageStart: number
): { readonly heading: EnemyHeading; readonly start: number } | undefined => {
  const contentBeforeImage = content.slice(0, imageStart);
  const blockquoteStart = contentBeforeImage
    .toLowerCase()
    .lastIndexOf("<blockquote");
  if (blockquoteStart !== -1) {
    const text = extractMargonemForumText(
      content.slice(blockquoteStart, imageStart)
    );
    if (text.length <= 250) {
      const heading = parseEnemyHeading(text);
      if (heading !== undefined) {
        return { heading, start: blockquoteStart };
      }
    }
  }

  const nearbyHtml = content.slice(Math.max(0, imageStart - 300), imageStart);
  const boldMatches = [
    ...nearbyHtml.matchAll(/<b\b[^>]*>(?<text>[\s\S]*?)<\/b\s*>/giu),
  ];
  const lastBold = boldMatches.at(-1);
  if (lastBold?.index === undefined) {
    return undefined;
  }

  const heading = parseEnemyHeading(
    extractMargonemForumText(lastBold.groups?.text ?? "")
  );
  return heading === undefined
    ? undefined
    : {
        heading,
        start: Math.max(0, imageStart - 300) + lastBold.index,
      };
};

const findEnemyMarkers = (content: string): readonly EnemyMarker[] => {
  const markers: EnemyMarker[] = [];
  const seenStarts = new Set<number>();

  for (const match of content.matchAll(imagePattern)) {
    const imageStart = match.index;
    const source = extractMargonemForumAttribute(match[0], "src");
    if (imageStart === undefined || source === undefined) {
      continue;
    }

    const icon = normalizeLegendaryEnemyIcon(
      decodeMargonemForumHtmlEntities(source).trim()
    );
    if (Option.isNone(icon)) {
      continue;
    }

    const heading = nearestHeading(content, imageStart);
    if (heading === undefined || seenStarts.has(heading.start)) {
      continue;
    }

    seenStarts.add(heading.start);
    markers.push({
      heading: heading.heading,
      iconUrl: icon.value.url,
      sourceIconKey: icon.value.sourceKey,
      start: heading.start,
    });
  }

  return markers.toSorted((left, right) => left.start - right.start);
};

const parseStats = (
  value: string,
  category: LegendaryEnemyCategory,
  postId: MargonemForumPostId
): Effect.Effect<
  {
    readonly attributes: readonly MargonemForumItemStat[];
    readonly itemClass: number;
    readonly name: string;
  },
  MargonemForumGuideNotParseable
> => {
  const parts = decodeMargonemForumHtmlEntities(value).split("||");
  if (parts.length !== 4) {
    return Effect.fail(
      parseError(category, "item stats must contain four parts", postId)
    );
  }

  const [rawName, rawStats, rawClass] = parts;
  const name = rawName?.trim() ?? "";
  if (name.length === 0 || rawStats === undefined || rawClass === undefined) {
    return Effect.fail(
      parseError(category, "item stats are incomplete", postId)
    );
  }

  if (!itemClassPattern.test(rawClass.trim())) {
    return Effect.fail(parseError(category, "item class is invalid", postId));
  }
  const itemClass = Number(rawClass.trim());
  if (!Number.isSafeInteger(itemClass) || itemClass < 1) {
    return Effect.fail(parseError(category, "item class is invalid", postId));
  }

  const attributes: MargonemForumItemStat[] = [];
  const seenKeys = new Set<string>();
  for (const part of rawStats.split(";")) {
    const token = part.trim();
    if (token.length === 0) {
      continue;
    }
    const separatorIndex = token.indexOf("=");
    const key = (
      separatorIndex === -1 ? token : token.slice(0, separatorIndex)
    ).trim();
    const statValue =
      separatorIndex === -1 ? null : token.slice(separatorIndex + 1).trim();
    if (key.length === 0 || seenKeys.has(key)) {
      return Effect.fail(
        parseError(category, "item stats contain an invalid key", postId)
      );
    }
    seenKeys.add(key);
    attributes.push({ key, value: statValue });
  }

  return Effect.succeed({ attributes, itemClass, name });
};

const findStat = (
  attributes: readonly MargonemForumItemStat[],
  key: string
): string | null =>
  attributes.find((attribute) => attribute.key === key)?.value ?? null;

const parseProfessions = (
  value: string | null,
  category: LegendaryEnemyCategory,
  postId: MargonemForumPostId
): Effect.Effect<
  readonly LegendaryProfession[],
  MargonemForumGuideNotParseable
> => {
  if (value === null || value.length === 0) {
    return Effect.succeed([]);
  }

  const professions: LegendaryProfession[] = [];
  const seen = new Set<LegendaryProfession>();
  for (const code of value) {
    const profession = professionByCode.get(code);
    if (profession === undefined) {
      return Effect.fail(
        parseError(category, `unknown profession code ${code}`, postId)
      );
    }
    if (!seen.has(profession)) {
      seen.add(profession);
      professions.push(profession);
    }
  }

  return Effect.succeed(professions);
};

const parseItemImage = Effect.fnUntraced(function* parseItemImage(
  imageHtml: string,
  category: LegendaryEnemyCategory,
  postId: MargonemForumPostId
): Effect.fn.Return<
  MargonemForumLegendaryItem | null,
  MargonemForumGuideNotParseable
> {
  const source = extractMargonemForumAttribute(imageHtml, "src");
  const statsValue = extractMargonemForumAttribute(imageHtml, "stats");
  if (source === undefined || statsValue === undefined) {
    return yield* parseError(
      category,
      "item image is missing src or stats",
      postId
    );
  }

  const icon = normalizeLegendaryItemIcon(
    decodeMargonemForumHtmlEntities(source).trim()
  );
  if (Option.isNone(icon)) {
    return yield* parseError(
      category,
      "item icon is not a CDN item path",
      postId
    );
  }

  const parsedStats = yield* parseStats(statsValue, category, postId);
  const statKeys = new Set(
    parsedStats.attributes.map((attribute) => attribute.key)
  );
  const equipmentType = classifyLegendaryEquipment({
    iconSourceKey: icon.value.sourceKey,
    itemClass: parsedStats.itemClass,
    rarity: findStat(parsedStats.attributes, "rarity"),
    statKeys,
  });
  if (Option.isNone(equipmentType)) {
    return null;
  }

  const levelValue = findStat(parsedStats.attributes, "lvl");
  const level = Number(levelValue);
  if (levelValue === null || !Number.isSafeInteger(level) || level < 1) {
    return yield* parseError(
      category,
      "legendary equipment has no valid level",
      postId
    );
  }

  const legendaryBonusValue = findStat(parsedStats.attributes, "legbon");
  return {
    equipmentType: equipmentType.value,
    iconUrl: icon.value.url,
    legendaryBonus:
      legendaryBonusValue === null || legendaryBonusValue.trim().length === 0
        ? null
        : LegendaryBonus.make(legendaryBonusValue),
    level: LegendaryItemLevel.make(level),
    name: parsedStats.name,
    professions: yield* parseProfessions(
      findStat(parsedStats.attributes, "reqp"),
      category,
      postId
    ),
    sourceIconKey: icon.value.sourceKey,
    statAttributes: parsedStats.attributes,
  };
});

const parseItemSequence = Effect.fnUntraced(function* parseItemSequence(
  section: string,
  category: LegendaryEnemyCategory,
  postId: MargonemForumPostId,
  emptyReason: string
): Effect.fn.Return<
  readonly MargonemForumLegendaryItem[],
  MargonemForumGuideNotParseable
> {
  let cursor = 0;
  let parsedItemCount = 0;
  const legendaryItems: MargonemForumLegendaryItem[] = [];
  for (const match of section.matchAll(imagePattern)) {
    const imageStart = match.index;
    if (imageStart === undefined) {
      continue;
    }

    const interstitialText = extractMargonemForumText(
      section.slice(cursor, imageStart)
    );
    if (interstitialText.length > 0) {
      break;
    }

    const ctip = extractMargonemForumAttribute(match[0], "ctip");
    if (ctip?.toLowerCase() !== "item") {
      break;
    }

    parsedItemCount += 1;
    const item = yield* parseItemImage(match[0], category, postId);
    if (item !== null) {
      legendaryItems.push(item);
    }
    cursor = imageStart + match[0].length;
  }

  if (parsedItemCount === 0) {
    return yield* parseError(category, emptyReason, postId);
  }

  return legendaryItems;
});

const parseLootTemplate = Effect.fnUntraced(function* parseLootTemplate(
  blockHtml: string,
  category: LegendaryEnemyCategory,
  postId: MargonemForumPostId
): Effect.fn.Return<
  readonly MargonemForumLegendaryItem[],
  MargonemForumGuideNotParseable
> {
  const template = itemTemplatePattern.exec(blockHtml);
  if (template?.index === undefined) {
    return yield* parseError(category, "enemy has no loot template", postId);
  }

  return yield* parseItemSequence(
    blockHtml.slice(template.index + template[0].length),
    category,
    postId,
    "loot template contains no valid item images"
  );
});

const parseIndirectLoot = Effect.fnUntraced(function* parseIndirectLoot(
  blockHtml: string,
  category: LegendaryEnemyCategory,
  postId: MargonemForumPostId
): Effect.fn.Return<IndirectLoot | null, MargonemForumGuideNotParseable> {
  const sectionMatch = indirectLootPattern.exec(blockHtml);
  const sourceHtml = sectionMatch?.groups?.source;
  if (sectionMatch?.index === undefined || sourceHtml === undefined) {
    return null;
  }

  const sourceEnemyName = extractMargonemForumText(sourceHtml);
  if (sourceEnemyName.length === 0) {
    return yield* parseError(
      category,
      "indirect reward has no source enemy name",
      postId
    );
  }

  const items = yield* parseItemSequence(
    blockHtml.slice(sectionMatch.index + sectionMatch[0].length),
    category,
    postId,
    "indirect reward contains no valid item images"
  );
  return { items, sourceEnemyName };
});

const sameItemMetadata = (
  left: MargonemForumLegendaryItem,
  right: MargonemForumLegendaryItem
): boolean =>
  left.name === right.name &&
  left.level === right.level &&
  left.equipmentType === right.equipmentType;

const recordEnemyItems = Effect.fnUntraced(function* recordEnemyItems(
  accumulator: CatalogAccumulator,
  category: LegendaryEnemyCategory,
  enemySourceIconKey: LegendaryEnemySourceKey,
  items: readonly MargonemForumLegendaryItem[],
  postId: MargonemForumPostId
): Effect.fn.Return<void, MargonemForumGuideNotParseable> {
  const enemyKey = `${category}:${enemySourceIconKey}`;
  for (const item of items) {
    const existing = accumulator.itemBySourceKey.get(item.sourceIconKey);
    if (existing !== undefined && !sameItemMetadata(existing, item)) {
      return yield* parseError(
        category,
        `item source drift within snapshot for ${item.sourceIconKey}`,
        postId
      );
    }
    accumulator.itemBySourceKey.set(item.sourceIconKey, existing ?? item);

    const dropKey = `${item.sourceIconKey}:${enemyKey}`;
    if (!accumulator.dropKeys.has(dropKey)) {
      accumulator.dropKeys.add(dropKey);
      accumulator.drops.push({
        enemyCategory: category,
        enemySourceIconKey,
        itemSourceIconKey: item.sourceIconKey,
      });
    }
  }
});

/** Parse one complete forum topic into current official enemies and legendary equipment. */
export const parseMargonemForumTopic = Effect.fn("MargonemForumTopic.parse")(
  // eslint-disable-next-line complexity -- one parser owns the complete topic safety boundary.
  function* parseMargonemForumTopic({
    category,
    html,
    url,
  }: MargonemForumTopicPage): Effect.fn.Return<
    MargonemForumCatalogSnapshot,
    MargonemForumGuideNotParseable
  > {
    const posts = splitPostContainers(html);
    const officialPosts = posts.filter((post) => isOfficialPost(post.html));
    if (officialPosts.length === 0) {
      return yield* parseError(category, "no official staff posts found");
    }

    const expectedHeading = category === "hero" ? "HEROSI" : "ELITY II";
    const hasGuideHeading = officialPosts.some((post) => {
      const content = extractPostContent(post.html);
      return (
        content !== undefined &&
        extractMargonemForumText(content).includes(expectedHeading)
      );
    });
    if (!hasGuideHeading) {
      return yield* parseError(
        category,
        `official guide heading ${expectedHeading} was not found`
      );
    }

    const enemies: MargonemForumEnemy[] = [];
    const itemBySourceKey = new Map<
      LegendaryItemSourceKey,
      MargonemForumLegendaryItem
    >();
    const drops: MargonemForumDrop[] = [];
    const dropKeys = new Set<string>();
    const accumulator: CatalogAccumulator = {
      dropKeys,
      drops,
      itemBySourceKey,
    };
    const enemyKeys = new Set<string>();
    const sourcePosts: MargonemForumSourcePost[] = [];

    for (const post of officialPosts) {
      const content = extractPostContent(post.html);
      if (content === undefined || !itemTemplatePattern.test(content)) {
        continue;
      }

      const markers = findEnemyMarkers(content);
      const directMarkersByName = new Map<string, EnemyMarker[]>();
      let parsedEnemyCount = 0;
      for (const [index, marker] of markers.entries()) {
        const end = markers[index + 1]?.start ?? content.length;
        const block = content.slice(marker.start, end);
        if (itemTemplatePattern.test(block)) {
          const items = yield* parseLootTemplate(block, category, post.postId);
          const enemyKey = `${category}:${marker.sourceIconKey}`;
          if (enemyKeys.has(enemyKey)) {
            return yield* parseError(
              category,
              `duplicate enemy source key ${marker.sourceIconKey}`,
              post.postId
            );
          }
          enemyKeys.add(enemyKey);
          parsedEnemyCount += 1;
          enemies.push({
            category,
            iconUrl: marker.iconUrl,
            level: marker.heading.level,
            name: marker.heading.name,
            profession: marker.heading.profession,
            sourceIconKey: marker.sourceIconKey,
            sourcePostId: post.postId,
            sourceUrl: url,
          });
          const markersWithName = directMarkersByName.get(marker.heading.name);
          if (markersWithName === undefined) {
            directMarkersByName.set(marker.heading.name, [marker]);
          } else {
            markersWithName.push(marker);
          }
          yield* recordEnemyItems(
            accumulator,
            category,
            marker.sourceIconKey,
            items,
            post.postId
          );
          continue;
        }

        const indirectLoot = yield* parseIndirectLoot(
          block,
          category,
          post.postId
        );
        if (indirectLoot === null) {
          continue;
        }

        const sourceMarkers = directMarkersByName.get(
          indirectLoot.sourceEnemyName
        );
        const sourceMarker = sourceMarkers?.[0];
        if (sourceMarker === undefined || sourceMarkers?.length !== 1) {
          return yield* parseError(
            category,
            `indirect reward source ${indirectLoot.sourceEnemyName} is not unique in its post`,
            post.postId
          );
        }
        yield* recordEnemyItems(
          accumulator,
          category,
          sourceMarker.sourceIconKey,
          indirectLoot.items,
          post.postId
        );
      }

      if (parsedEnemyCount > 0) {
        sourcePosts.push({
          category,
          editedAt: editedAtPattern.exec(post.html)?.groups?.value ?? null,
          postId: post.postId,
        });
      }
    }

    if (enemies.length === 0) {
      return yield* parseError(
        category,
        "no complete official enemy entries found"
      );
    }
    if (itemBySourceKey.size === 0) {
      return yield* parseError(
        category,
        "official guide contains no legendary equipment"
      );
    }

    return {
      drops,
      enemies,
      items: [...itemBySourceKey.values()],
      sourcePosts,
    };
  }
);

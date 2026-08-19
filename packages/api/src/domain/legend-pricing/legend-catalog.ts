import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { brandedPositiveInt } from "../squad-builder/positive-int.ts";

/** A persisted legendary item row identifier. */
export const LegendaryItemId = brandedPositiveInt(
  "LegendaryItemId",
  "LegendaryItemId"
);
export type LegendaryItemId = typeof LegendaryItemId.Type;

/** A persisted legendary enemy row identifier. */
export const LegendaryEnemyId = brandedPositiveInt(
  "LegendaryEnemyId",
  "LegendaryEnemyId"
);
export type LegendaryEnemyId = typeof LegendaryEnemyId.Type;

/** An identifier of an official Margonem forum post. */
export const MargonemForumPostId = brandedPositiveInt(
  "MargonemForumPostId",
  "MargonemForumPostId"
);
export type MargonemForumPostId = typeof MargonemForumPostId.Type;

/** A valid level of a legendary equipment item. */
export const LegendaryItemLevel = brandedPositiveInt(
  "LegendaryItemLevel",
  "LegendaryItemLevel"
);
export type LegendaryItemLevel = typeof LegendaryItemLevel.Type;

/** A valid level of an enemy that drops legendary equipment. */
export const LegendaryEnemyLevel = brandedPositiveInt(
  "LegendaryEnemyLevel",
  "LegendaryEnemyLevel"
);
export type LegendaryEnemyLevel = typeof LegendaryEnemyLevel.Type;

/** The current-guide categories that can supply legendary equipment. */
export const LegendaryEnemyCategory = Schema.Literals(["hero", "elite2"]);
export type LegendaryEnemyCategory = typeof LegendaryEnemyCategory.Type;

/** Equipment slots supported by the legend catalog. */
export const LegendaryEquipmentType = Schema.Literals([
  "weapon",
  "orb",
  "armor",
  "helmet",
  "boots",
  "gloves",
  "ring",
  "necklace",
  "shield",
]);
export type LegendaryEquipmentType = typeof LegendaryEquipmentType.Type;

/** Character professions used by enemies and equipment requirements. */
export const LegendaryProfession = Schema.Literals([
  "warrior",
  "paladin",
  "bladeDancer",
  "mage",
  "hunter",
  "tracker",
]);
export type LegendaryProfession = typeof LegendaryProfession.Type;

/** A non-empty legendary bonus encoded in forum item statistics. */
export const LegendaryBonus = Schema.Trim.pipe(
  Schema.check(Schema.isNonEmpty()),
  Schema.brand("LegendaryBonus")
);
export type LegendaryBonus = typeof LegendaryBonus.Type;

/** A non-negative price expressed in whole gold units. */
export const LegendPriceGold = Schema.Finite.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 0 })
).pipe(Schema.brand("LegendPriceGold"));
export type LegendPriceGold = typeof LegendPriceGold.Type;

/** Version used by optimistic cost updates; zero means no cost exists yet. */
export const LegendCostVersion = Schema.Int.check(
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 0 })
).pipe(Schema.brand("LegendCostVersion"));
export type LegendCostVersion = typeof LegendCostVersion.Type;

/** A normalized item-icon path used as the stable source identity. */
export const LegendaryItemSourceKey = Schema.String.check(
  Schema.isPattern(/^\/obrazki\/itemy\/[a-zA-Z0-9._~!$&'()+,;=@%/-]+$/u)
).pipe(Schema.brand("LegendaryItemSourceKey"));
export type LegendaryItemSourceKey = typeof LegendaryItemSourceKey.Type;

/** A normalized NPC-icon path used as part of the stable source identity. */
export const LegendaryEnemySourceKey = Schema.String.check(
  Schema.isPattern(/^\/obrazki\/npc\/[a-zA-Z0-9._~!$&'()+,;=@%/-]+$/u)
).pipe(Schema.brand("LegendaryEnemySourceKey"));
export type LegendaryEnemySourceKey = typeof LegendaryEnemySourceKey.Type;

/** A canonical HTTPS URL for an icon hosted on the Margonem CDN. */
export const MargonemCdnIconUrl = Schema.String.check(
  Schema.isPattern(
    /^https:\/\/micc\.garmory-cdn\.cloud\/obrazki\/(?:itemy|npc)\/[a-zA-Z0-9._~!$&'()+,;=@%/-]+$/u
  )
).pipe(Schema.brand("MargonemCdnIconUrl"));
export type MargonemCdnIconUrl = typeof MargonemCdnIconUrl.Type;

/** A normalized and canonicalized Margonem CDN icon. */
export interface NormalizedMargonemCdnIcon<SourceKey> {
  readonly sourceKey: SourceKey;
  readonly url: MargonemCdnIconUrl;
}

const MARGONEM_CDN_HOST = "micc.garmory-cdn.cloud";
const duplicateSlashPattern = /\/{2,}/gu;

const normalizeCdnPath = (value: string): string | undefined => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value.startsWith("//") ? `https:${value}` : value);
  } catch {
    return undefined;
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== MARGONEM_CDN_HOST ||
    parsedUrl.username !== "" ||
    parsedUrl.password !== "" ||
    parsedUrl.port !== ""
  ) {
    return undefined;
  }

  if (parsedUrl.pathname.includes("..")) {
    return undefined;
  }

  return parsedUrl.pathname.replaceAll(duplicateSlashPattern, "/");
};

/**
 * Normalize an item icon to its CDN path identity and canonical HTTPS URL.
 *
 * Non-CDN URLs and paths outside `/obrazki/itemy/` are rejected.
 */
export const normalizeLegendaryItemIcon = (
  value: string
): Option.Option<NormalizedMargonemCdnIcon<LegendaryItemSourceKey>> => {
  const path = normalizeCdnPath(value);
  if (path === undefined || !path.startsWith("/obrazki/itemy/")) {
    return Option.none();
  }

  const sourceKey = Schema.decodeOption(LegendaryItemSourceKey)(path);
  return sourceKey.pipe(
    Option.map((key) => ({
      sourceKey: key,
      url: MargonemCdnIconUrl.make(`https://${MARGONEM_CDN_HOST}${key}`),
    }))
  );
};

/**
 * Normalize an NPC icon to its CDN path identity and canonical HTTPS URL.
 *
 * Non-CDN URLs and paths outside `/obrazki/npc/` are rejected.
 */
export const normalizeLegendaryEnemyIcon = (
  value: string
): Option.Option<NormalizedMargonemCdnIcon<LegendaryEnemySourceKey>> => {
  const path = normalizeCdnPath(value);
  if (path === undefined || !path.startsWith("/obrazki/npc/")) {
    return Option.none();
  }

  const sourceKey = Schema.decodeOption(LegendaryEnemySourceKey)(path);
  return sourceKey.pipe(
    Option.map((key) => ({
      sourceKey: key,
      url: MargonemCdnIconUrl.make(`https://${MARGONEM_CDN_HOST}${key}`),
    }))
  );
};

/** Source metadata needed to decide whether an item is supported equipment. */
export interface LegendaryEquipmentClassificationInput {
  readonly iconSourceKey: LegendaryItemSourceKey;
  readonly itemClass: number;
  readonly rarity: string | null;
  readonly statKeys: ReadonlySet<string>;
}

const equipmentTypeByForumClass = new Map<number, LegendaryEquipmentType>([
  [1, "weapon"],
  [2, "weapon"],
  [3, "weapon"],
  [4, "weapon"],
  [5, "weapon"],
  [6, "weapon"],
  [7, "orb"],
  [8, "armor"],
  [9, "helmet"],
  [10, "boots"],
  [11, "gloves"],
  [12, "ring"],
  [13, "necklace"],
  [14, "shield"],
]);

const excludedEquipmentStatKeys = new Set([
  "bag",
  "btype",
  "lootbox2",
  "outfit_selector",
  "quest",
  "runes",
]);

/**
 * Classify forum item metadata for the legend catalog.
 *
 * Only legendary items in known equipment classes qualify. Explicit container,
 * rune, quest, and outfit statistics reject a record even if its class drifts.
 */
export const classifyLegendaryEquipment = ({
  iconSourceKey,
  itemClass,
  rarity,
  statKeys,
}: LegendaryEquipmentClassificationInput): Option.Option<LegendaryEquipmentType> => {
  if (
    rarity !== "legendary" ||
    iconSourceKey.startsWith("/obrazki/itemy/out/")
  ) {
    return Option.none();
  }

  for (const key of excludedEquipmentStatKeys) {
    if (statKeys.has(key)) {
      return Option.none();
    }
  }

  return Option.fromNullishOr(equipmentTypeByForumClass.get(itemClass));
};

/** Build the persisted diagnostic fingerprint for item source drift checks. */
export const makeLegendaryItemFingerprint = (input: {
  readonly equipmentType: LegendaryEquipmentType;
  readonly level: LegendaryItemLevel;
  readonly name: string;
}): string =>
  JSON.stringify([input.name.trim(), input.level, input.equipmentType]);

/** Build the persisted diagnostic fingerprint for enemy source drift checks. */
export const makeLegendaryEnemyFingerprint = (input: {
  readonly level: LegendaryEnemyLevel;
  readonly name: string;
}): string => JSON.stringify([input.name.trim(), input.level]);

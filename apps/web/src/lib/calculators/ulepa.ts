import * as Num from "effect/Number";

export type UlepaRarity =
  | "zwykły"
  | "unikatowy"
  | "heroiczny"
  | "ulepszony"
  | "legendarny";

/**
 * Rarities in display order, used by the calculator page's rarity select.
 */
export const ULEPA_RARITIES: readonly UlepaRarity[] = [
  "heroiczny",
  "legendarny",
  "ulepszony",
  "unikatowy",
  "zwykły",
] as const;

/**
 * Default item level pre-filled in the calculator form.
 */
export const ULEPA_DEFAULT_ITEM_LEVEL = 280;

interface RarityFactor {
  upgradeRarityFactor: number;
  upgradeGoldFactor: number;
}

/**
 * Game constants for upgrade calculations
 * Values are derived from game mechanics
 */
const GAME_CONSTANTS = {
  DEFAULT_ITEM_LEVEL: 280,
  ENHANCED_BASE_COST: 27_000,
  ENHANCED_LEVEL_MULTIPLIER: 150,
  EXTRACTION_RATE: 0.75,
  STANDARD_BASE_COST: 180,
} as const;

const rarityFactors: Record<UlepaRarity, RarityFactor> = {
  heroiczny: { upgradeGoldFactor: 30, upgradeRarityFactor: 100 },
  legendarny: { upgradeGoldFactor: 60, upgradeRarityFactor: 1000 },
  ulepszony: { upgradeGoldFactor: 40, upgradeRarityFactor: -1 },
  unikatowy: { upgradeGoldFactor: 10, upgradeRarityFactor: 10 },
  zwykły: { upgradeGoldFactor: 1, upgradeRarityFactor: 1 },
};

/** Multipliers for each upgrade level (1-5) - index 0 is unused */
const UPGRADE_LEVEL_FACTORS: readonly number[] = [0, 1, 2.1, 3.4, 5, 7];

const MIN_LEVEL = 1;
const MAX_LEVEL = 300;
const GOLD_COST_LEVEL_MULTIPLIER = 10;
const GOLD_COST_LEVEL_ADDEND = 1300;
const EXTRACTION_GOLD_PER_POINT = 60;

const clampLevel = (n: number): number => {
  const v = Math.trunc(n);
  if (Number.isNaN(v)) {
    return MIN_LEVEL;
  }
  return Num.clamp(v, { maximum: MAX_LEVEL, minimum: MIN_LEVEL });
};

/**
 * Formats gold amount in compact notation
 */
export const formatGold = (amount: number): string => {
  const value = Math.floor(amount);
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}mld`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}m`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}k`;
  }
  return value.toLocaleString("pl-PL");
};

export const calculateUpgradePoints = (
  lvl: number,
  rarity: UlepaRarity
): number[] => {
  const level = clampLevel(lvl);
  const factors = rarityFactors[rarity];
  if (!factors) {
    throw new Error("Nieznana rzadkość przedmiotu");
  }

  const upgradeCosts: number[] = [];

  for (let n = 1; n <= 5; n += 1) {
    const upgradeLevelFactor = UPGRADE_LEVEL_FACTORS[n];
    if (upgradeLevelFactor === undefined) {
      throw new Error("Nieznany poziom ulepszenia");
    }
    const cost =
      rarity === "ulepszony"
        ? upgradeLevelFactor *
          (GAME_CONSTANTS.ENHANCED_LEVEL_MULTIPLIER * level +
            GAME_CONSTANTS.ENHANCED_BASE_COST)
        : factors.upgradeRarityFactor *
          upgradeLevelFactor *
          (GAME_CONSTANTS.STANDARD_BASE_COST + level);
    upgradeCosts.push(cost);
  }

  return upgradeCosts;
};

export const calculateDifferentialCosts = (
  upgradeCosts: number[]
): number[] => {
  const differentialCosts: number[] = [];
  for (let i = 0; i < upgradeCosts.length; i += 1) {
    if (i === 0) {
      differentialCosts.push(upgradeCosts[i] ?? 0);
    } else {
      differentialCosts.push(
        (upgradeCosts[i] ?? 0) - (upgradeCosts[i - 1] ?? 0)
      );
    }
  }
  return differentialCosts;
};

export const calculateUpgradeSummary = (
  level: number,
  rarity: UlepaRarity
): {
  cumulativeCosts: number[];
  differentialCosts: number[];
  totalUpgradeCost: number;
  total75Percent: number;
  upgradeGoldCost: number;
  extractionGoldCost: number;
} => {
  const cumulativeCosts = calculateUpgradePoints(level, rarity);
  const differentialCosts = calculateDifferentialCosts(cumulativeCosts);
  const totalUpgradeCost = Num.sumAll(differentialCosts);
  const total75Percent = totalUpgradeCost * GAME_CONSTANTS.EXTRACTION_RATE;
  const upgradeGoldCost =
    (GOLD_COST_LEVEL_MULTIPLIER * level + GOLD_COST_LEVEL_ADDEND) *
    level *
    rarityFactors[rarity].upgradeGoldFactor;
  const extractionGoldCost = EXTRACTION_GOLD_PER_POINT * totalUpgradeCost;

  return {
    cumulativeCosts,
    differentialCosts,
    extractionGoldCost,
    total75Percent,
    totalUpgradeCost,
    upgradeGoldCost,
  };
};

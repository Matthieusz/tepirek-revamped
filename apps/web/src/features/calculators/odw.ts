export type OdwRarity = "zwykły" | "unikatowy" | "heroiczny" | "legendarny";

const ODW_RARITY_MULTIPLIERS = {
  heroiczny: 1.5,

  legendarny: 3,

  unikatowy: 1.2,

  zwykły: 1,
} satisfies Record<OdwRarity, number>;

const ODW_RARITY_CAPS = {
  heroiczny: { maxCost: 3375, threshold: 30 },

  legendarny: { maxCost: 6750, threshold: 30 },

  unikatowy: { maxCost: 1800, threshold: 20 },

  zwykły: { maxCost: 1500, threshold: 20 },
} satisfies Record<OdwRarity, { threshold: number; maxCost: number }>;

/** Result of calculating an item's unbind cost. */
export interface OdwUnbindCost {
  readonly baseValue: number;
  readonly totalCost: number;
  readonly isCapped: boolean;
}

/** Rarity-specific facts used to explain an item's unbind cost. */
export interface OdwRarityInfo {
  readonly maxCost: number;
  readonly multiplier: number;
}

/**
 * Calculates unbind cost based on original game formula
 * Formula: 75 × round(i × rarity_multiplier) where i = 10 + 0.1 × level
 * With caps per rarity
 */
export const calculateUnbindCost: (
  level: number,
  rarity: OdwRarity
) => OdwUnbindCost = (level, rarity) => {
  const baseValue = 10 + 0.1 * level;
  const cap = ODW_RARITY_CAPS[rarity];
  const multiplier = ODW_RARITY_MULTIPLIERS[rarity];

  const isCapped =
    rarity === "zwykły"
      ? baseValue > cap.threshold
      : baseValue >= cap.threshold;

  if (isCapped) {
    return { baseValue, isCapped: true, totalCost: cap.maxCost };
  }

  const adjustedValue = baseValue * multiplier;
  const roundedValue = Math.round(adjustedValue);
  const totalCost = 75 * roundedValue;

  return { baseValue, isCapped: false, totalCost };
};

/**
 * Rarity display facts the calculator page needs: the cap that the cost
 * rolls up to and the multiplier applied before the cap. Exposed as an
 * intention-shaped accessor so the page does not reach into the internal
 * rarity records.
 */
export const getOdwRarityInfo: (rarity: OdwRarity) => OdwRarityInfo = (
  rarity
) => ({
  maxCost: ODW_RARITY_CAPS[rarity].maxCost,
  multiplier: ODW_RARITY_MULTIPLIERS[rarity],
});

export type OdwRarity = "zwykły" | "unikatowy" | "heroiczny" | "legendarny";
/** Rarity multipliers applied to base value */
const ODW_RARITY_MULTIPLIERS: Record<OdwRarity, number> = {
  // +50%
  heroiczny: 1.5,
  // +200%
  legendarny: 3,
  // +20%
  unikatowy: 1.2,
  // No bonus
  zwykły: 1,
};

/** Cap threshold for base value (i) per rarity */
const ODW_RARITY_CAPS: Record<
  OdwRarity,
  { threshold: number; maxCost: number }
> = {
  // i >= 30
  heroiczny: { maxCost: 3375, threshold: 30 },
  // i >= 30
  legendarny: { maxCost: 6750, threshold: 30 },
  // i >= 20
  unikatowy: { maxCost: 1800, threshold: 20 },
  // i > 20
  zwykły: { maxCost: 1500, threshold: 20 },
};

/**
 * Calculates unbind cost based on original game formula
 * Formula: 75 × round(i × rarity_multiplier) where i = 10 + 0.1 × level
 * With caps per rarity
 */
export const calculateUnbindCost = (
  level: number,
  rarity: OdwRarity
): { baseValue: number; totalCost: number; isCapped: boolean } => {
  // i = 10 + 0.1 * a
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

  // Apply multiplier and calculate cost
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
export const getOdwRarityInfo = (
  rarity: OdwRarity
): {
  maxCost: number;
  multiplier: number;
} => ({
  maxCost: ODW_RARITY_CAPS[rarity].maxCost,
  multiplier: ODW_RARITY_MULTIPLIERS[rarity],
});

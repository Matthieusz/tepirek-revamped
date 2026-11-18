const MIN_LEVEL = 1;

const MAX_LEVEL = 500;

const LEVEL_DIFFERENCE_BASE = 16;

const LEVEL_DIFFERENCE_SCALING_START = 100;

const LEVEL_DIFFERENCE_SCALING_DIVISOR = 5;

const GROUP_ATTACK_STRENGTH_MULTIPLIER = 0.5;

const GROUP_ATTACK_THRESHOLD_BASE = 15;

const GROUP_ATTACK_THRESHOLD_MULTIPLIER = 0.1;

const GROUP_ATTACK_THRESHOLD_OFFSET = 20;

interface GroupAttackPenaltyResult {
  maxAttackerLevel: number;
  avgAttackerLevel: number;
  avgDefenderLevel: number;
  attackerStrength: number;
  threshold: number;
  difference: number;
  wouldReceivePenalty: boolean;
}

export interface SinglePenaltyResult {
  actualDifference: number;
  attackerLevel: number;
  maxAttackerWithoutPenalty: number;
  minLevelDifference: number;
  minVictimLevelForPenalty: number;
  victimLevel: number;
  wouldReceivePenalty: boolean;
}

export interface GroupPenaltyResult extends GroupAttackPenaltyResult {
  attackerLevels: number[];
  defenderLevels: number[];
}

/**
 * Calculates minimum level difference required to avoid penalty points
 * Formula: min_lvl_difference = 16 + max(0, (lvl_player - 100) / 5)
 */
export const calculateMinLevelDifference = (attackerLevel: number) =>
  LEVEL_DIFFERENCE_BASE +
  Math.max(
    0,
    (attackerLevel - LEVEL_DIFFERENCE_SCALING_START) /
      LEVEL_DIFFERENCE_SCALING_DIVISOR
  );

/**
 * Checks if attacker would receive penalty points for killing a lower level player
 */
export const wouldReceivePenalty = (
  attackerLevel: number,
  victimLevel: number
) => {
  const minDiff = calculateMinLevelDifference(attackerLevel);
  const actualDiff = attackerLevel - victimLevel;

  return actualDiff >= minDiff;
};

/**
 * Calculates the minimum victim level that would give penalty points
 */
export const calculateMinVictimLevelForPenalty = (attackerLevel: number) => {
  const minDiff = calculateMinLevelDifference(attackerLevel);

  return Math.ceil(attackerLevel - minDiff);
};

/**
 * Calculates the maximum attacker level that can attack without penalty
 */
export const calculateMaxAttackerLevelWithoutPenalty = (
  victimLevel: number
) => {
  let maxLevel = victimLevel;

  for (let lvl = victimLevel; lvl <= MAX_LEVEL; lvl += 1) {
    const minDiff = calculateMinLevelDifference(lvl);

    if (lvl - victimLevel < minDiff) {
      maxLevel = lvl;
    } else {
      break;
    }
  }

  return maxLevel;
};

/**
 * Calculates group attack penalty check
 * Formula: 0.5 * (max_lvl_attackers + avg_lvl_attackers) - avg_lvl_defenders > 15 + max(0, 0.1 * (max_lvl_attackers + avg_lvl_attackers) - 20)
 */
export const calculateGroupAttackPenalty = (
  attackerLevels: number[],
  defenderLevels: number[]
) => {
  const maxAttackerLevel = Math.max(...attackerLevels);

  const avgAttackerLevel =
    attackerLevels.reduce((sum, level) => sum + level, 0) /
    attackerLevels.length;

  const avgDefenderLevel =
    defenderLevels.reduce((sum, level) => sum + level, 0) /
    defenderLevels.length;

  const attackerStrength = maxAttackerLevel + avgAttackerLevel;

  const difference =
    GROUP_ATTACK_STRENGTH_MULTIPLIER * attackerStrength - avgDefenderLevel;

  const threshold =
    GROUP_ATTACK_THRESHOLD_BASE +
    Math.max(
      0,
      GROUP_ATTACK_THRESHOLD_MULTIPLIER * attackerStrength -
        GROUP_ATTACK_THRESHOLD_OFFSET
    );

  return {
    attackerStrength,
    avgAttackerLevel,
    avgDefenderLevel,
    difference,
    maxAttackerLevel,
    threshold,
    wouldReceivePenalty: difference > threshold,
  };
};

/**
 * Parse comma-separated levels string into array of numbers
 */
export const parseLevels = (input: string) =>
  input.split(",").flatMap((value) => {
    const level = Number(value.trim());

    return Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL
      ? [level]
      : [];
  });

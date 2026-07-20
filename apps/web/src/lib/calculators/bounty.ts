/**
 * Bounty / wanted-list penalty calculator.
 *
 * Pure formula logic shared by the bounty calculator page. Owns the
 * single-combat and group-combat penalty rules and the level-list parser.
 * React, icons, and zod schemas stay in the page; this module is the
 * single source of truth for the penalty math.
 */

import * as Arr from "effect/Array";
import * as Num from "effect/Number";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Str from "effect/String";

const MIN_LEVEL = 1;
const MAX_LEVEL = 500;

const LevelFromString = Schema.NumberFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isBetween({ maximum: MAX_LEVEL, minimum: MIN_LEVEL }))
);
const decodeLevel = Schema.decodeUnknownOption(LevelFromString);

/**
 * Base level difference threshold before scaling
 */
const LEVEL_DIFFERENCE_BASE = 16;
/**
 * Level at which scaling starts
 */
const LEVEL_DIFFERENCE_SCALING_START = 100;
/**
 * Scaling divisor for level difference
 */
const LEVEL_DIFFERENCE_SCALING_DIVISOR = 5;

/**
 * Group attack formula constants
 */
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
export const calculateMinLevelDifference = (attackerLevel: number): number =>
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
): boolean => {
  const minDiff = calculateMinLevelDifference(attackerLevel);
  const actualDiff = attackerLevel - victimLevel;
  return actualDiff >= minDiff;
};

/**
 * Calculates the minimum victim level that would give penalty points
 */
export const calculateMinVictimLevelForPenalty = (
  attackerLevel: number
): number => {
  const minDiff = calculateMinLevelDifference(attackerLevel);
  return Math.ceil(attackerLevel - minDiff);
};

/**
 * Calculates the maximum attacker level that can attack without penalty
 */
export const calculateMaxAttackerLevelWithoutPenalty = (
  victimLevel: number
): number => {
  // We need to find max attackerLevel where:
  // attackerLevel - victimLevel < 16 + max(0, (attackerLevel - 100) / 5)
  // This requires solving iteratively since attackerLevel appears on both sides
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
): GroupAttackPenaltyResult => {
  const maxAttackerLevel = Math.max(...attackerLevels);
  const avgAttackerLevel = Num.sumAll(attackerLevels) / attackerLevels.length;
  const avgDefenderLevel = Num.sumAll(defenderLevels) / defenderLevels.length;

  // Left side of inequality: 0.5 * (max + avg_attackers) - avg_defenders
  const attackerStrength = maxAttackerLevel + avgAttackerLevel;
  const difference =
    GROUP_ATTACK_STRENGTH_MULTIPLIER * attackerStrength - avgDefenderLevel;

  // Right side of inequality: 15 + max(0, 0.1 * (max + avg_attackers) - 20)
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
export const parseLevels = (input: string): number[] =>
  Arr.flatMap(Str.split(input, ","), (value) =>
    Option.toArray(decodeLevel(Str.trim(value)))
  );

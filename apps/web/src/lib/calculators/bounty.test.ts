import { describe, expect, it } from "vitest";

import {
  calculateGroupAttackPenalty,
  calculateMaxAttackerLevelWithoutPenalty,
  calculateMinLevelDifference,
  calculateMinVictimLevelForPenalty,
  parseLevels,
  wouldReceivePenalty,
} from "./bounty";

describe("bounty calculator", () => {
  describe("calculateMinLevelDifference", () => {
    it("returns the base threshold for levels at or below the scaling start", () => {
      expect(calculateMinLevelDifference(100)).toBe(16);
      expect(calculateMinLevelDifference(50)).toBe(16);
    });

    it("scales above level 100", () => {
      expect(calculateMinLevelDifference(200)).toBe(36);
      expect(calculateMinLevelDifference(500)).toBe(96);
    });
  });

  describe("wouldReceivePenalty", () => {
    it("is true when the level difference meets the minimum", () => {
      // attacker 200, minDiff 36 → victim 164 gives diff 36
      expect(wouldReceivePenalty(200, 164)).toBe(true);
    });

    it("is false just below the minimum difference", () => {
      // diff 35 < minDiff 36
      expect(wouldReceivePenalty(200, 165)).toBe(false);
    });
  });

  describe("calculateMinVictimLevelForPenalty", () => {
    it("returns the ceiling of attacker level minus the min difference", () => {
      expect(calculateMinVictimLevelForPenalty(200)).toBe(164);
    });
  });

  describe("calculateMaxAttackerLevelWithoutPenalty", () => {
    it("returns the highest attacker level that avoids penalty for the victim", () => {
      expect(calculateMaxAttackerLevelWithoutPenalty(150)).toBe(182);
    });

    it("is one below the first level that incurs penalty", () => {
      const maxSafe = calculateMaxAttackerLevelWithoutPenalty(150);
      expect(wouldReceivePenalty(maxSafe, 150)).toBe(false);
      expect(wouldReceivePenalty(maxSafe + 1, 150)).toBe(true);
    });
  });

  describe("calculateGroupAttackPenalty", () => {
    it("reports penalty when difference exceeds threshold", () => {
      const result = calculateGroupAttackPenalty([200, 180, 160], [150, 140]);

      expect(result).toMatchObject({
        attackerStrength: 380,
        avgAttackerLevel: 180,
        avgDefenderLevel: 145,
        difference: 45,
        maxAttackerLevel: 200,
        threshold: 33,
        wouldReceivePenalty: true,
      });
    });

    it("reports no penalty when difference does not exceed threshold", () => {
      const result = calculateGroupAttackPenalty([160, 150], [200, 190]);

      expect(result.wouldReceivePenalty).toBe(false);
    });
  });

  describe("parseLevels", () => {
    it("splits, trims, and keeps valid levels in order", () => {
      expect(parseLevels("200, 180, 160")).toEqual([200, 180, 160]);
    });

    it("drops non-numeric entries", () => {
      expect(parseLevels("200, abc, 160")).toEqual([200, 160]);
    });

    it("drops values outside the allowed level range", () => {
      expect(parseLevels("0, 600, 150")).toEqual([150]);
    });

    it("returns an empty array for empty or unparseable input", () => {
      expect(parseLevels("")).toEqual([]);
      expect(parseLevels("abc")).toEqual([]);
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  ULEPA_DEFAULT_ITEM_LEVEL,
  ULEPA_RARITIES,
  calculateDifferentialCosts,
  calculateUpgradePoints,
  calculateUpgradeSummary,
  formatGold,
} from "./ulepa";

describe("ulepa calculator", () => {
  it("calculates cumulative upgrade points for a normal item", () => {
    expect(calculateUpgradePoints(10, "zwykły")).toEqual([
      190, 399, 646, 950, 1330,
    ]);
  });

  it("calculates differential upgrade costs", () => {
    expect(calculateDifferentialCosts([190, 399, 646, 950, 1330])).toEqual([
      190, 209, 247, 304, 380,
    ]);
  });

  it("summarizes upgrade and extraction costs", () => {
    expect(calculateUpgradeSummary(10, "zwykły")).toMatchObject({
      extractionGoldCost: 79_800,
      total75Percent: 997.5,
      totalUpgradeCost: 1330,
      upgradeGoldCost: 14_000,
    });
  });

  it("uses the enhanced rarity formula", () => {
    const points = calculateUpgradePoints(10, "ulepszony");

    expect(points[0]).toBe(28_500);
    expect(points[4]).toBe(199_500);
  });

  it("clamps item levels before calculating point costs", () => {
    expect(calculateUpgradePoints(0, "zwykły")).toEqual(
      calculateUpgradePoints(1, "zwykły")
    );
    expect(calculateUpgradePoints(Number.NaN, "zwykły")).toEqual(
      calculateUpgradePoints(1, "zwykły")
    );
    expect(calculateUpgradePoints(999, "zwykły")).toEqual(
      calculateUpgradePoints(300, "zwykły")
    );
  });

  it("formats gold with Polish compact suffixes", () => {
    expect(formatGold(999)).toBe("999");
    expect(formatGold(1000)).toBe("1k");
    expect(formatGold(1_000_000)).toBe("1m");
    expect(formatGold(1_000_000_000)).toBe("1mld");
  });

  it("exposes the rarity set in display order", () => {
    expect(ULEPA_RARITIES).toEqual([
      "heroiczny",
      "legendarny",
      "ulepszony",
      "unikatowy",
      "zwykły",
    ]);
  });

  it("exposes the default item level used by the form", () => {
    expect(ULEPA_DEFAULT_ITEM_LEVEL).toBe(280);
  });
});

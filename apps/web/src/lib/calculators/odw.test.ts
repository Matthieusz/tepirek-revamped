import { describe, expect, it } from "vitest";

import { calculateUnbindCost } from "./odw";

describe("calculateUnbindCost", () => {
  it("calculates an uncapped normal item", () => {
    const result = calculateUnbindCost(1, "zwykły");

    expect(result.baseValue).toBeCloseTo(10.1);
    expect(result.isCapped).toBe(false);
    expect(result.totalCost).toBe(750);
  });

  it("caps normal items only when base value is greater than 20", () => {
    expect(calculateUnbindCost(100, "zwykły")).toMatchObject({
      isCapped: false,
      totalCost: 1500,
    });
    expect(calculateUnbindCost(101, "zwykły")).toMatchObject({
      isCapped: true,
      totalCost: 1500,
    });
  });

  it("caps non-normal rarities when base value reaches the threshold", () => {
    expect(calculateUnbindCost(100, "unikatowy")).toMatchObject({
      isCapped: true,
      totalCost: 1800,
    });
    expect(calculateUnbindCost(200, "heroiczny")).toMatchObject({
      isCapped: true,
      totalCost: 3375,
    });
    expect(calculateUnbindCost(200, "legendarny")).toMatchObject({
      isCapped: true,
      totalCost: 6750,
    });
  });

  it("applies rarity multipliers before the cap", () => {
    const result = calculateUnbindCost(50, "unikatowy");

    expect(result.baseValue).toBeCloseTo(15);
    expect(result.isCapped).toBe(false);
    expect(result.totalCost).toBe(1350);
  });
});

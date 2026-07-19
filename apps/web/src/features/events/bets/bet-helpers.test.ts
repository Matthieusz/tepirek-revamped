import { describe, expect, it } from "vitest";

import { calculatePointsPerMember } from "./bet-helpers";

describe("calculatePointsPerMember", () => {
  it("calculates points for a single member", () => {
    expect(calculatePointsPerMember(1)).toBe(20);
  });

  it("floors points to two decimals", () => {
    expect(calculatePointsPerMember(3)).toBe(6.66);
  });
});

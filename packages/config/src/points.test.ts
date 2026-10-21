import { calculatePointsPerMember } from "@tepirek-revamped/config/application/guild-ledger";
import { describe, expect, it } from "vite-plus/test";

describe("calculatePointsPerMember", () => {
  it("calculates points for a single member", () => {
    expect(calculatePointsPerMember(1)).toBe(20);
  });

  it("floors points to two decimals", () => {
    expect(calculatePointsPerMember(3)).toBe(6.66);
  });
});

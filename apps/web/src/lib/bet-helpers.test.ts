import { describe, expect, it } from "vitest";

import { calculatePointsPerMember, handleUserToggle } from "./bet-helpers";

describe("bet helpers", () => {
  it("calculates points for a single member", () => {
    expect(calculatePointsPerMember(1)).toBe(20);
  });

  it("floors points to two decimals", () => {
    expect(calculatePointsPerMember(3)).toBe(6.66);
  });

  it("adds a user when toggled on", () => {
    expect(handleUserToggle("u2", ["u1"])).toEqual(["u1", "u2"]);
  });

  it("removes a user when toggled off", () => {
    expect(handleUserToggle("u1", ["u1", "u2"])).toEqual(["u2"]);
  });

  it("does not mutate the original selected users", () => {
    const currentUserIds = ["u1"];

    handleUserToggle("u2", currentUserIds);

    expect(currentUserIds).toEqual(["u1"]);
  });
});

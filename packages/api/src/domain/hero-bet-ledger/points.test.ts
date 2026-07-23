import { describe, expect, it } from "vitest";

import { parsePointWorth } from "./points.ts";

describe("parsePointWorth", () => {
  it.each(["not-a-number", "NaN", "Infinity", "-Infinity"])(
    "rejects malformed persisted point worth %s",
    (pointWorth) => {
      expect(() => parsePointWorth(pointWorth)).toThrow();
    }
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects non-finite persisted point worth %s",
    (pointWorth) => {
      expect(() => parsePointWorth(pointWorth)).toThrow();
    }
  );

  it("decodes finite numbers and null", () => {
    expect(parsePointWorth("1.25")).toBe(1.25);
    expect(parsePointWorth(2)).toBe(2);
    expect(parsePointWorth(null)).toBeNull();
  });
});

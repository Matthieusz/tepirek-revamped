import { describe, expect, it } from "vitest";

import { parsePendingMargonemAccountRefetchId } from "./pending-margonem-account-refetch-id.js";
import { isError, isOk } from "./result.js";

describe("parsePendingMargonemAccountRefetchId", () => {
  it("accepts positive integer pending refetch ids", () => {
    const result = parsePendingMargonemAccountRefetchId(123);

    expect(isOk(result)).toBe(true);
  });

  it("rejects non-positive or non-integer pending refetch ids", () => {
    for (const value of [0, -1, 1.5, Number.NaN]) {
      const result = parsePendingMargonemAccountRefetchId(value);

      expect(isError(result)).toBe(true);
    }
  });
});

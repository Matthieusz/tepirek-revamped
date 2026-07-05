import { describe, expect, it } from "vitest";

import { isFailure, isSuccess } from "./outcome.js";
import { parsePendingMargonemAccountRefetchId } from "./pending-margonem-account-refetch-id.js";

describe("parsePendingMargonemAccountRefetchId", () => {
  it("accepts positive integer pending refetch ids", () => {
    const result = parsePendingMargonemAccountRefetchId(123);

    expect(isSuccess(result)).toBe(true);
  });

  it("rejects non-positive or non-integer pending refetch ids", () => {
    for (const value of [0, -1, 1.5, Number.NaN]) {
      const result = parsePendingMargonemAccountRefetchId(value);

      expect(isFailure(result)).toBe(true);
    }
  });
});

import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { describe, expect, it } from "vitest";

import { parsePendingMargonemAccountRefetchId } from "./pending-margonem-account-refetch-id.js";

describe("parsePendingMargonemAccountRefetchId", () => {
  it("accepts positive integer pending refetch ids", () => {
    const exit = Effect.runSyncExit(parsePendingMargonemAccountRefetchId(123));
    expect(Exit.isSuccess(exit)).toBe(true);
  });

  it("rejects non-positive or non-integer pending refetch ids", () => {
    for (const value of [0, -1, 1.5, Number.NaN]) {
      const exit = Effect.runSyncExit(
        parsePendingMargonemAccountRefetchId(value)
      );
      expect(Exit.isFailure(exit)).toBe(true);
    }
  });
});

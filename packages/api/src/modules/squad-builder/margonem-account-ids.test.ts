import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { describe, expect, it } from "vitest";

import { parseMargonemAccountAccessId } from "./margonem-account-access-id.js";
import { parseMargonemAccountId } from "./margonem-account-id.js";

describe("parseMargonemAccountId", () => {
  it("accepts positive integer account ids", () => {
    const exit = Effect.runSyncExit(parseMargonemAccountId(1));
    expect(Exit.isSuccess(exit)).toBe(true);
  });

  it("rejects non-positive or non-integer account ids", () => {
    for (const value of [0, -1, 1.5, Number.NaN]) {
      const exit = Effect.runSyncExit(parseMargonemAccountId(value));
      expect(Exit.isFailure(exit)).toBe(true);
    }
  });
});

describe("parseMargonemAccountAccessId", () => {
  it("accepts positive integer access ids", () => {
    const exit = Effect.runSyncExit(parseMargonemAccountAccessId(7));
    expect(Exit.isSuccess(exit)).toBe(true);
  });

  it("rejects non-positive or non-integer access ids", () => {
    for (const value of [0, -3, 2.2, Number.POSITIVE_INFINITY]) {
      const exit = Effect.runSyncExit(parseMargonemAccountAccessId(value));
      expect(Exit.isFailure(exit)).toBe(true);
    }
  });
});

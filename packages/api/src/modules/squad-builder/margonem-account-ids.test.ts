import { describe, expect, it } from "vitest";

import { parseMargonemAccountAccessId } from "./margonem-account-access-id.js";
import { parseMargonemAccountId } from "./margonem-account-id.js";
import { isError, isOk } from "./result.js";

describe("parseMargonemAccountId", () => {
  it("accepts positive integer account ids", () => {
    const result = parseMargonemAccountId(1);

    expect(isOk(result)).toBe(true);
  });

  it("rejects non-positive or non-integer account ids", () => {
    for (const value of [0, -1, 1.5, Number.NaN]) {
      const result = parseMargonemAccountId(value);
      expect(isError(result)).toBe(true);

      if (!isError(result)) {
        throw new Error(`Expected ${value} to be rejected`);
      }

      expect(result.error._tag).toBe("InvalidMargonemAccountId");
    }
  });
});

describe("parseMargonemAccountAccessId", () => {
  it("accepts positive integer access ids", () => {
    const result = parseMargonemAccountAccessId(7);

    expect(isOk(result)).toBe(true);
  });

  it("rejects non-positive or non-integer access ids", () => {
    for (const value of [0, -3, 2.2, Number.POSITIVE_INFINITY]) {
      const result = parseMargonemAccountAccessId(value);
      expect(isError(result)).toBe(true);

      if (!isError(result)) {
        throw new Error(`Expected ${value} to be rejected`);
      }

      expect(result.error._tag).toBe("InvalidMargonemAccountAccessId");
    }
  });
});

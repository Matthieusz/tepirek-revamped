import { describe, expect, it } from "vitest";

import {
  accountDisplayNameToString,
  parseAccountDisplayName,
} from "./account-display-name.js";
import { isFailure, isSuccess } from "./outcome.js";

describe("parseAccountDisplayName", () => {
  it("trims and accepts a non-empty account display name", () => {
    const result = parseAccountDisplayName("  informati  ");

    expect(isSuccess(result)).toBe(true);

    if (!isSuccess(result)) {
      throw new Error("Expected display name to be valid");
    }

    expect(accountDisplayNameToString(result.value)).toBe("informati");
  });

  it("rejects empty and overlong account display names", () => {
    expect(isFailure(parseAccountDisplayName("   "))).toBe(true);
    expect(isFailure(parseAccountDisplayName(""))).toBe(true);
    expect(isFailure(parseAccountDisplayName("a".repeat(81)))).toBe(true);

    const maxName = "a".repeat(80);
    const maxResult = parseAccountDisplayName(maxName);

    expect(isSuccess(maxResult)).toBe(true);

    if (!isSuccess(maxResult)) {
      throw new Error("Expected 80-char display name to be valid");
    }

    expect(accountDisplayNameToString(maxResult.value)).toBe(maxName);
  });
});

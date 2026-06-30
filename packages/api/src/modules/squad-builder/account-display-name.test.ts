import { describe, expect, it } from "vitest";

import {
  accountDisplayNameToString,
  parseAccountDisplayName,
} from "./account-display-name";
import { isError, isOk } from "./result";

describe("parseAccountDisplayName", () => {
  it("trims and accepts a non-empty account display name", () => {
    const result = parseAccountDisplayName("  informati  ");

    expect(isOk(result)).toBe(true);

    if (!isOk(result)) {
      throw new Error("Expected display name to be valid");
    }

    expect(accountDisplayNameToString(result.value)).toBe("informati");
  });

  it("rejects empty and overlong account display names", () => {
    expect(isError(parseAccountDisplayName("   "))).toBe(true);
    expect(isError(parseAccountDisplayName(""))).toBe(true);
    expect(isError(parseAccountDisplayName("a".repeat(81)))).toBe(true);

    const maxName = "a".repeat(80);
    const maxResult = parseAccountDisplayName(maxName);

    expect(isOk(maxResult)).toBe(true);

    if (!isOk(maxResult)) {
      throw new Error("Expected 80-char display name to be valid");
    }

    expect(accountDisplayNameToString(maxResult.value)).toBe(maxName);
  });
});

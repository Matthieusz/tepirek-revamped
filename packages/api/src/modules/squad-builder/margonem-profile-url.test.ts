import { describe, expect, it } from "vitest";

import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "./margonem-profile-url";
import { isError, isOk } from "./result";

describe("Margonem profile URL parsing", () => {
  it("extracts the numeric profile id from canonical and anchored profile URLs", () => {
    const canonical = parseMargonemProfileUrl(
      "https://www.margonem.pl/profile/view,7298897"
    );
    const anchored = parseMargonemProfileUrl(
      "https://www.margonem.pl/profile/view,7298897#char_1296625,jaruna"
    );

    expect(isOk(canonical)).toBe(true);
    expect(isOk(anchored)).toBe(true);

    if (!isOk(canonical) || !isOk(anchored)) {
      throw new Error("Expected profile URL parsing to succeed");
    }

    expect(canonical.value).toBe(7_298_897);
    expect(anchored.value).toBe(7_298_897);
  });

  it("rejects non-Margonem profile URLs", () => {
    const parsed = parseMargonemProfileUrl(
      "https://example.com/profile/view,7298897"
    );

    expect(isError(parsed)).toBe(true);
  });

  it("generates canonical profile URLs from profile ids", () => {
    const parsed = parseMargonemProfileUrl(
      "https://www.margonem.pl/profile/view,7298897#char_1296625,jaruna"
    );

    if (!isOk(parsed)) {
      throw new Error("Expected profile URL parsing to succeed");
    }

    expect(toMargonemProfileUrl(parsed.value)).toBe(
      "https://www.margonem.pl/profile/view,7298897"
    );
  });
});

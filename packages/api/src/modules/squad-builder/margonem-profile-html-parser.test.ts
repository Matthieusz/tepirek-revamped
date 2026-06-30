import { describe, expect, it } from "vitest";

import { parseMargonemProfileHtml } from "./margonem-profile-html-parser";
import { parseMargonemProfileId } from "./margonem-profile-id";
import { isError, isOk } from "./result";

const parseFixtureProfileId = () => {
  const profileId = parseMargonemProfileId(7_298_897);

  if (!isOk(profileId)) {
    throw new Error("Expected test profile id to be valid");
  }

  return profileId.value;
};

describe("Margonem profile HTML parser", () => {
  it("returns a typed parser failure when profile name is missing", () => {
    const parsed = parseMargonemProfileHtml({
      html: '<html><body><li class="char-row"></li></body></html>',
      profileId: parseFixtureProfileId(),
    });

    expect(isError(parsed)).toBe(true);

    if (!isError(parsed)) {
      throw new Error("Expected profile HTML parsing to fail");
    }

    expect(parsed.error._tag).toBe("MargonemProfileNameNotFound");
  });
});

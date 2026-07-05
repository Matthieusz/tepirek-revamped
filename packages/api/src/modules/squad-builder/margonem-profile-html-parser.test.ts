import { describe, expect, it } from "vitest";

import { parseMargonemProfileHtml } from "./margonem-profile-html-parser.js";
import { parseMargonemProfileId } from "./margonem-profile-id.js";
import { isFailure, isSuccess } from "./outcome.js";

const parseFixtureProfileId = () => {
  const profileId = parseMargonemProfileId(7_298_897);

  if (!isSuccess(profileId)) {
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

    expect(isFailure(parsed)).toBe(true);

    if (!isFailure(parsed)) {
      throw new Error("Expected profile HTML parsing to fail");
    }

    expect(parsed.error._tag).toBe("MargonemProfileNameNotFound");
  });
});

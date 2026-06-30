import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseMargonemProfileHtml } from "./margonem-profile-html-parser";
import { parseMargonemProfileId } from "./margonem-profile-id";
import { isError, isOk } from "./result";

const loadFirecrawlHtmlFixture = (): string => {
  const fixturePath = path.join(process.cwd(), "../../test-scrape.json");
  const rawFixture: unknown = JSON.parse(readFileSync(fixturePath, "utf-8"));

  if (
    typeof rawFixture !== "object" ||
    rawFixture === null ||
    !("html" in rawFixture) ||
    typeof rawFixture.html !== "string"
  ) {
    throw new Error("Invalid Firecrawl fixture shape");
  }

  return rawFixture.html;
};

const parseFixtureProfileId = () => {
  const profileId = parseMargonemProfileId(7_298_897);

  if (!isOk(profileId)) {
    throw new Error("Expected test profile id to be valid");
  }

  return profileId.value;
};

describe("Margonem profile HTML parser", () => {
  it("parses account name and Jaruna character rows from the Firecrawl HTML fixture", () => {
    const parsed = parseMargonemProfileHtml({
      html: loadFirecrawlHtmlFixture(),
      profileId: parseFixtureProfileId(),
    });

    expect(isOk(parsed)).toBe(true);

    if (!isOk(parsed)) {
      throw new Error("Expected profile HTML parsing to succeed");
    }

    expect(parsed.value.suggestedAccountName).toBe("informati");
    expect(
      parsed.value.jarunaCharacters.map((character) => character.characterId)
    ).toEqual([
      1_566_049, 1_299_941, 1_296_625, 1_621_516, 1_565_931, 1_615_754,
      1_565_827,
    ]);
    expect(parsed.value.jarunaCharacters).toContainEqual(
      expect.objectContaining({
        avatarUrl:
          "https://micc.garmory-cdn.cloud/obrazki/postacie/eve/g25-kurczaki-m.gif",
        level: 315,
        name: "informati",
        profession: "tracker",
        world: "jaruna",
      })
    );
  });

  it("discards non-Jaruna character rows from the Firecrawl HTML fixture", () => {
    const parsed = parseMargonemProfileHtml({
      html: loadFirecrawlHtmlFixture(),
      profileId: parseFixtureProfileId(),
    });

    if (!isOk(parsed)) {
      throw new Error("Expected profile HTML parsing to succeed");
    }

    expect(parsed.value.jarunaCharacters).toHaveLength(7);
    expect(
      parsed.value.jarunaCharacters.some(
        (character) => character.name === "Mambojumbo"
      )
    ).toBe(false);
  });

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

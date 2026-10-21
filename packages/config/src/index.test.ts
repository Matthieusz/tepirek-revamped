import {
  isAuctionProfession,
  isAuctionType,
} from "@tepirek-revamped/config/application/auctions";
import { isEventIconId } from "@tepirek-revamped/config/application/events";
import { slugifySkillRangeName } from "@tepirek-revamped/config/application/skills";
import { describe, expect, it } from "vite-plus/test";

describe("shared application rules", () => {
  it("rejects invalid event icon ids", () => {
    for (const value of ["", "dragon", "Egg"]) {
      expect(isEventIconId(value)).toBe(false);
    }
  });

  it("rejects invalid auction types", () => {
    for (const value of ["", "primary", "Main"]) {
      expect(isAuctionType(value)).toBe(false);
    }
  });

  it("rejects invalid auction professions", () => {
    for (const value of ["", "dragon", "Paladin"]) {
      expect(isAuctionProfession(value)).toBe(false);
    }
  });

  it("slugifies Polish skill range names", () => {
    expect(slugifySkillRangeName("Przedział 100")).toBe("przedzial-100");
    expect(slugifySkillRangeName("Łowca 300+")).toBe("lowca-300");
  });

  it("collapses whitespace and punctuation in skill range slugs", () => {
    expect(slugifySkillRangeName("  Elita   Lodowa!!! 300  ")).toBe(
      "elita-lodowa-300"
    );
  });

  it("returns an empty skill range slug when no usable characters remain", () => {
    expect(slugifySkillRangeName("+++ ---")).toBe("");
  });
});

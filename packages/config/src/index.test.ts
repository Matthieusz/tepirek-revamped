import { describe, expect, it } from "vitest";

import {
  AUCTION_PROFESSIONS,
  AUCTION_TYPES,
  EVENT_ICON_IDS,
  isAuctionProfession,
  isAuctionType,
  isEventIconId,
  slugifySkillRangeName,
} from "./index.ts";

describe("config type guards", () => {
  it("accepts every event icon id", () => {
    for (const eventIconId of EVENT_ICON_IDS) {
      expect(isEventIconId(eventIconId)).toBe(true);
    }
  });

  it("rejects invalid event icon ids", () => {
    for (const value of ["", "dragon", "Egg"]) {
      expect(isEventIconId(value)).toBe(false);
    }
  });

  it("accepts every auction type", () => {
    for (const auctionType of AUCTION_TYPES) {
      expect(isAuctionType(auctionType)).toBe(true);
    }
  });

  it("rejects invalid auction types", () => {
    for (const value of ["", "primary", "Main"]) {
      expect(isAuctionType(value)).toBe(false);
    }
  });

  it("accepts every auction profession", () => {
    for (const auctionProfession of AUCTION_PROFESSIONS) {
      expect(isAuctionProfession(auctionProfession)).toBe(true);
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

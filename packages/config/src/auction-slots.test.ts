import { describe, expect, it } from "vitest";

import {
  AUCTION_PROFESSIONS,
  AUCTION_SLOT_COLUMNS,
  AUCTION_SLOT_LEVELS,
  AUCTION_SLOT_ROUNDS,
  AUCTION_TYPES,
  getAuctionSlotColumnCount,
  getAuctionSlotColumns,
  isLegalAuctionSlot,
} from "./index.ts";

const legalSlot = {
  column: 1,
  level: 30,
  profession: "paladin",
  round: 1,
  type: "main",
} as const;

describe("auction slot levels", () => {
  it("ranges from 30 to 300 in steps of 10", () => {
    expect(AUCTION_SLOT_LEVELS[0]).toBe(30);
    expect(AUCTION_SLOT_LEVELS.at(-1)).toBe(300);
    expect(AUCTION_SLOT_LEVELS).toHaveLength(28);
    for (const level of AUCTION_SLOT_LEVELS) {
      expect(level % 10).toBe(0);
    }
  });

  it("does not include values the table never renders", () => {
    expect(AUCTION_SLOT_LEVELS.includes(35)).toBe(false);
    expect(AUCTION_SLOT_LEVELS.includes(20)).toBe(false);
    expect(AUCTION_SLOT_LEVELS.includes(310)).toBe(false);
  });
});

describe("auction slot rounds", () => {
  it("is 1 through 4", () => {
    expect([...AUCTION_SLOT_ROUNDS]).toEqual([1, 2, 3, 4]);
  });
});

describe("auction slot columns", () => {
  it("defines labels for every profession/type combination", () => {
    for (const profession of AUCTION_PROFESSIONS) {
      for (const type of AUCTION_TYPES) {
        const columns = getAuctionSlotColumns(profession, type);
        expect(columns.length).toBeGreaterThan(0);
        expect(columns.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it("gives hunter support two columns", () => {
    expect(getAuctionSlotColumnCount("hunter", "support")).toBe(2);
    expect(getAuctionSlotColumns("hunter", "support")).toEqual([
      "Fizyczna",
      "Trucizna",
    ]);
  });

  it("gives paladin main three columns", () => {
    expect(getAuctionSlotColumnCount("paladin", "main")).toBe(3);
  });

  it("keeps the column source of truth in one map", () => {
    expect(AUCTION_SLOT_COLUMNS.hunter.support).toEqual([
      "Fizyczna",
      "Trucizna",
    ]);
  });
});

describe("isLegalAuctionSlot", () => {
  it("accepts a valid main paladin slot", () => {
    expect(isLegalAuctionSlot(legalSlot)).toBe(true);
  });

  it("accepts every rendered level with every round and column", () => {
    const columnCount = getAuctionSlotColumnCount("paladin", "main");
    const columns = Array.from({ length: columnCount }, (_, i) => i + 1);
    for (const level of AUCTION_SLOT_LEVELS) {
      for (const round of AUCTION_SLOT_ROUNDS) {
        for (const column of columns) {
          expect(
            isLegalAuctionSlot({
              column,
              level,
              profession: "paladin",
              round,
              type: "main",
            })
          ).toBe(true);
        }
      }
    }
  });

  it("rejects round 5", () => {
    expect(isLegalAuctionSlot({ ...legalSlot, round: 5 as number })).toBe(
      false
    );
  });

  it("rejects unrendered levels such as 35", () => {
    expect(isLegalAuctionSlot({ ...legalSlot, level: 35 })).toBe(false);
  });

  it("rejects levels outside the table range", () => {
    expect(isLegalAuctionSlot({ ...legalSlot, level: 20 })).toBe(false);
    expect(isLegalAuctionSlot({ ...legalSlot, level: 310 })).toBe(false);
  });

  it("rejects a third column for a two-column profession/type", () => {
    expect(
      isLegalAuctionSlot({
        column: 3,
        level: 30,
        profession: "hunter",
        round: 1,
        type: "support",
      })
    ).toBe(false);
  });

  it("rejects non-positive or fractional coordinates", () => {
    for (const override of [
      { column: 0 },
      { column: 1.5 },
      { level: 0 },
      { level: 30.5 },
      { round: 0 },
      { round: 1.5 },
    ]) {
      expect(isLegalAuctionSlot({ ...legalSlot, ...override })).toBe(false);
    }
  });
});

import { describe, expect, it } from "vitest";

import {
  formatGoldAmountInput,
  formatVaultEarnings,
  parseGoldAmount,
  tryParseGoldAmount,
} from "./gold";

const pl = (n: number) =>
  n.toLocaleString("pl-PL", { maximumFractionDigits: 0 });

describe("formatVaultEarnings", () => {
  it("formats zero and empty input as 0", () => {
    expect(formatVaultEarnings("0")).toBe("0");
    expect(formatVaultEarnings("")).toBe("0");
  });

  it("keeps a value already on a million boundary", () => {
    expect(formatVaultEarnings("2000000000")).toBe(pl(2_000_000_000));
  });

  it("rounds a fractional-million remainder down to whole millions", () => {
    // 1_500_500_000 rounds down to 1_500_000_000 — the rule most likely to drift
    expect(formatVaultEarnings("1500500000")).toBe(pl(1_500_000_000));
  });

  it("rounds down even when the remainder is close to the next million", () => {
    expect(formatVaultEarnings("1999999")).toBe(pl(1_000_000));
  });

  it("uses Polish locale grouping matching the existing toLocaleString output", () => {
    expect(formatVaultEarnings("1500000000")).toBe(pl(1_500_000_000));
  });
});

describe("formatGoldAmountInput", () => {
  it("keeps saved million and billion amounts in shorthand", () => {
    expect(formatGoldAmountInput(700_000_000)).toBe("700m");
    expect(formatGoldAmountInput(1_200_000_000)).toBe("1.2g");
  });

  it("keeps the plain value when shorthand would not be shorter", () => {
    expect(formatGoldAmountInput(900_000)).toBe("900000");
    expect(formatGoldAmountInput(1_000_001)).toBe("1000001");
  });
});

describe("parseGoldAmount", () => {
  it("parses a plain integer amount", () => {
    expect(parseGoldAmount("50000000")).toBe(50_000_000);
  });

  it("treats a trailing m as millions", () => {
    expect(parseGoldAmount("700m")).toBe(700_000_000);
  });

  it("treats a trailing g as billions", () => {
    expect(parseGoldAmount("2g")).toBe(2_000_000_000);
  });

  it("floors fractional shorthand amounts to whole gold", () => {
    expect(parseGoldAmount("1.5m")).toBe(1_500_000);
    expect(parseGoldAmount("1.2g")).toBe(1_200_000_000);
  });

  it("is case-insensitive and trims surrounding whitespace", () => {
    expect(parseGoldAmount("2G")).toBe(2_000_000_000);
    expect(parseGoldAmount(" 2g ")).toBe(2_000_000_000);
  });

  it("returns 0 for unparseable input", () => {
    expect(parseGoldAmount("abc")).toBe(0);
    expect(parseGoldAmount("g")).toBe(0);
    expect(parseGoldAmount("")).toBe(0);
  });
});

describe("tryParseGoldAmount", () => {
  it("distinguishes a valid zero from invalid input", () => {
    expect(tryParseGoldAmount("0")).toBe(0);
    expect(tryParseGoldAmount("invalid")).toBeUndefined();
  });
});

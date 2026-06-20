import { describe, expect, it } from "vitest";

import { formatVaultEarnings, parseGoldAmount } from "./gold";

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

describe("parseGoldAmount", () => {
  it("parses a plain integer amount", () => {
    expect(parseGoldAmount("50000000")).toBe(50_000_000);
  });

  it("treats a trailing g as billions", () => {
    expect(parseGoldAmount("2g")).toBe(2_000_000_000);
  });

  it("floors a fractional g amount to whole gold", () => {
    expect(parseGoldAmount("1.5g")).toBe(1_500_000_000);
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

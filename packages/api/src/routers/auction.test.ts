import { describe, expect, it } from "vitest";

import { auctionSignupInputSchema } from "./auction";

const validSignupInput = {
  column: 1,
  level: 30,
  profession: "paladin",
  round: 1,
  type: "main",
} as const;

describe("auctionSignupInputSchema", () => {
  it("accepts positive integer slot coordinates", () => {
    expect(auctionSignupInputSchema.safeParse(validSignupInput).success).toBe(
      true
    );
  });

  it("rejects non-positive slot coordinates", () => {
    for (const input of [
      { ...validSignupInput, column: 0 },
      { ...validSignupInput, level: 0 },
      { ...validSignupInput, round: 0 },
    ]) {
      expect(auctionSignupInputSchema.safeParse(input).success).toBe(false);
    }
  });

  it("rejects fractional slot coordinates", () => {
    for (const input of [
      { ...validSignupInput, column: 1.5 },
      { ...validSignupInput, level: 30.5 },
      { ...validSignupInput, round: 1.5 },
    ]) {
      expect(auctionSignupInputSchema.safeParse(input).success).toBe(false);
    }
  });
});

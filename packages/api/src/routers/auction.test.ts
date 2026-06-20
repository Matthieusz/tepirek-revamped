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

  it("rejects an unknown profession", () => {
    expect(
      auctionSignupInputSchema.safeParse({
        ...validSignupInput,
        profession: "dragon",
      }).success
    ).toBe(false);
  });

  it("rejects an unknown type", () => {
    expect(
      auctionSignupInputSchema.safeParse({
        ...validSignupInput,
        type: "primary",
      }).success
    ).toBe(false);
  });

  it("rejects round 5", () => {
    expect(
      auctionSignupInputSchema.safeParse({
        ...validSignupInput,
        round: 5,
      }).success
    ).toBe(false);
  });

  it("rejects unrendered levels such as 35", () => {
    expect(
      auctionSignupInputSchema.safeParse({
        ...validSignupInput,
        level: 35,
      }).success
    ).toBe(false);
  });

  it("rejects levels outside the table range", () => {
    for (const level of [20, 310]) {
      expect(
        auctionSignupInputSchema.safeParse({ ...validSignupInput, level })
          .success
      ).toBe(false);
    }
  });

  it("rejects a third column for a two-column profession/type", () => {
    expect(
      auctionSignupInputSchema.safeParse({
        column: 3,
        level: 30,
        profession: "hunter",
        round: 1,
        type: "support",
      }).success
    ).toBe(false);
  });

  it("accepts the second column for a two-column profession/type", () => {
    expect(
      auctionSignupInputSchema.safeParse({
        column: 2,
        level: 30,
        profession: "hunter",
        round: 1,
        type: "support",
      }).success
    ).toBe(true);
  });
});

import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import { AuctionSignupPayload } from "../modules/auction/http-api-contract.js";

const parseSignup = Schema.decodeUnknownResult(AuctionSignupPayload);

const validSignupInput = {
  column: 1,
  level: 30,
  profession: "paladin",
  round: 1,
  type: "main",
} as const;

describe("AuctionSignupPayload", () => {
  it("accepts legal slot coordinates", () => {
    expect(Result.isSuccess(parseSignup(validSignupInput))).toBe(true);
  });

  it("rejects illegal slot coordinates", () => {
    for (const input of [
      { ...validSignupInput, column: 0 },
      { ...validSignupInput, level: 0 },
      { ...validSignupInput, round: 0 },
      { ...validSignupInput, profession: "dragon" },
      { ...validSignupInput, type: "primary" },
      { ...validSignupInput, round: 5 },
      { ...validSignupInput, level: 35 },
      { ...validSignupInput, level: 20 },
      { ...validSignupInput, level: 310 },
      { column: 3, level: 30, profession: "hunter", round: 1, type: "support" },
    ]) {
      expect(Result.isFailure(parseSignup(input))).toBe(true);
    }
  });
});

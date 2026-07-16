import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { describe } from "vitest";

import {
  AnnouncementId,
  AuctionSignupId,
  BetId,
  EventId,
  HeroId,
  ProfessionId,
  SkillId,
  SkillRangeId,
  TodoId,
} from "./core-identifiers.ts";

const identifiers = [
  ["announcement", AnnouncementId],
  ["auction signup", AuctionSignupId],
  ["bet", BetId],
  ["event", EventId],
  ["hero", HeroId],
  ["profession", ProfessionId],
  ["skill range", SkillRangeId],
  ["skill", SkillId],
  ["todo", TodoId],
] as const;

describe("core identifiers", () => {
  it.effect("decode positive integer representations", () =>
    Effect.gen(function* decodePositiveIntegers() {
      for (const [_name, schema] of identifiers) {
        expect(yield* Schema.decodeUnknownEffect(schema)(123)).toBe(123);
      }
    })
  );

  it.effect("reject non-positive and non-integer representations", () =>
    Effect.gen(function* rejectInvalidRepresentations() {
      for (const [_name, schema] of identifiers) {
        for (const value of [0, -1, 1.5, Number.NaN]) {
          const failure = yield* Schema.decodeUnknownEffect(schema)(value).pipe(
            Effect.flip
          );
          expect(failure._tag).toBe("SchemaError");
        }
      }
    })
  );
});

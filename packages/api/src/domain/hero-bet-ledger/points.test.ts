import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parsePointWorth } from "./points.ts";

describe("parsePointWorth", () => {
  it.effect.each(["not-a-number", "NaN", "Infinity", "-Infinity"])(
    "rejects malformed persisted point worth %s",
    (pointWorth) =>
      Effect.gen(function* rejectMalformedPointWorth() {
        const failure = yield* parsePointWorth(pointWorth).pipe(Effect.flip);
        expect(failure._tag).toBe("SchemaError");
      })
  );

  it.effect.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("rejects non-finite persisted point worth %s", (pointWorth) =>
    Effect.gen(function* rejectNonFinitePointWorth() {
      const failure = yield* parsePointWorth(pointWorth).pipe(Effect.flip);
      expect(failure._tag).toBe("SchemaError");
    })
  );

  it.effect("decodes finite numbers and null", () =>
    Effect.gen(function* decodePointWorth() {
      expect(yield* parsePointWorth("1.25")).toBe(1.25);
      expect(yield* parsePointWorth(2)).toBe(2);
      expect(yield* parsePointWorth(null)).toBeNull();
    })
  );
});

import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vitest";

import { parsePendingMargonemAccountRefetchId } from "./pending-margonem-account-refetch-id.ts";

describe("parsePendingMargonemAccountRefetchId", () => {
  it.effect("accepts positive integer pending refetch ids", () =>
    Effect.gen(function* acceptPositivePendingRefetchId() {
      expect(yield* parsePendingMargonemAccountRefetchId(123)).toBe(123);
    })
  );

  it.effect("rejects non-positive or non-integer pending refetch ids", () =>
    Effect.gen(function* rejectInvalidPendingRefetchIds() {
      for (const value of [0, -1, 1.5, Number.NaN]) {
        const failure = yield* parsePendingMargonemAccountRefetchId(value).pipe(
          Effect.flip
        );
        expect(failure._tag).toBe("InvalidPendingMargonemAccountRefetchId");
      }
    })
  );
});

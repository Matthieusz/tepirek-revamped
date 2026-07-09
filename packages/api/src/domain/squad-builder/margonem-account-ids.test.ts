import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vitest";

import { parseMargonemAccountAccessId } from "./margonem-account-access-id.js";
import { parseMargonemAccountId } from "./margonem-account-id.js";

describe("parseMargonemAccountId", () => {
  it.effect("accepts positive integer account ids", () =>
    Effect.gen(function* accountIdAccept() {
      const result = yield* parseMargonemAccountId(1);
      expect(result).toBe(1);
    })
  );

  it.effect("rejects non-positive or non-integer account ids", () =>
    Effect.gen(function* accountIdReject() {
      for (const value of [0, -1, 1.5, Number.NaN]) {
        const result = yield* parseMargonemAccountId(value).pipe(Effect.flip);
        expect(result._tag).toBe("InvalidMargonemAccountId");
      }
    })
  );
});

describe("parseMargonemAccountAccessId", () => {
  it.effect("accepts positive integer access ids", () =>
    Effect.gen(function* accessIdAccept() {
      const result = yield* parseMargonemAccountAccessId(7);
      expect(result).toBe(7);
    })
  );

  it.effect("rejects non-positive or non-integer access ids", () =>
    Effect.gen(function* accessIdReject() {
      for (const value of [0, -3, 2.2, Number.POSITIVE_INFINITY]) {
        const result = yield* parseMargonemAccountAccessId(value).pipe(
          Effect.flip
        );
        expect(result._tag).toBe("InvalidMargonemAccountAccessId");
      }
    })
  );
});

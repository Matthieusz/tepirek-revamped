import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vitest";

import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "./margonem-profile-url.js";

describe("Margonem profile URL parsing", () => {
  it.effect(
    "extracts the numeric profile id from canonical and anchored profile URLs",
    () =>
      Effect.gen(function* profileUrlExtractId() {
        const canonical = yield* parseMargonemProfileUrl(
          "https://www.margonem.pl/profile/view,7298897"
        );
        const anchored = yield* parseMargonemProfileUrl(
          "https://www.margonem.pl/profile/view,7298897#char_1296625,jaruna"
        );

        expect(canonical).toBe(7_298_897);
        expect(anchored).toBe(7_298_897);
      })
  );

  it.effect("rejects non-Margonem profile URLs", () =>
    Effect.gen(function* profileUrlRejectNonMargonem() {
      const result = yield* parseMargonemProfileUrl(
        "https://example.com/profile/view,7298897"
      ).pipe(Effect.flip);
      expect(result._tag).toBe("InvalidMargonemProfileUrl");
    })
  );

  it.effect("generates canonical profile URLs from profile ids", () =>
    Effect.gen(function* profileUrlGenerateCanonical() {
      const parsed = yield* parseMargonemProfileUrl(
        "https://www.margonem.pl/profile/view,7298897#char_1296625,jaruna"
      );
      expect(toMargonemProfileUrl(parsed)).toBe(
        "https://www.margonem.pl/profile/view,7298897"
      );
    })
  );
});

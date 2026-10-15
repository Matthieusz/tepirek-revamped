import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vite-plus/test";

import { parseAccountDisplayName } from "./account-display-name.ts";

describe("parseAccountDisplayName", () => {
  it.effect("trims and accepts a non-empty account display name", () =>
    Effect.gen(function* displayNameTrimAndAccept() {
      const name = yield* parseAccountDisplayName("  informati  ");
      expect(name).toBe("informati");
    })
  );

  it.effect.each(["", "   "])(
    "rejects empty account display name %j",
    (value) =>
      Effect.gen(function* displayNameRejectEmpty() {
        const result = yield* parseAccountDisplayName(value).pipe(Effect.flip);
        expect(result._tag).toBe("InvalidAccountDisplayName");
      })
  );

  it.effect("rejects overlong account display name", () =>
    Effect.gen(function* displayNameRejectOverlong() {
      const result = yield* parseAccountDisplayName("a".repeat(81)).pipe(
        Effect.flip
      );

      expect(result._tag).toBe("InvalidAccountDisplayName");
    })
  );

  it.effect("accepts a name at the maximum boundary", () =>
    Effect.gen(function* displayNameMaxBoundary() {
      const maxName = "a".repeat(80);
      const name = yield* parseAccountDisplayName(maxName);
      expect(name).toBe(maxName);
    })
  );
});

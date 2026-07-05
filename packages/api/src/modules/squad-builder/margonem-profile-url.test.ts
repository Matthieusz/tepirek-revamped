import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { describe, expect, it } from "vitest";

import {
  parseMargonemProfileUrl,
  toMargonemProfileUrl,
} from "./margonem-profile-url.js";

describe("Margonem profile URL parsing", () => {
  it("extracts the numeric profile id from canonical and anchored profile URLs", () => {
    const canonical = Effect.runSyncExit(
      parseMargonemProfileUrl("https://www.margonem.pl/profile/view,7298897")
    );
    const anchored = Effect.runSyncExit(
      parseMargonemProfileUrl(
        "https://www.margonem.pl/profile/view,7298897#char_1296625,jaruna"
      )
    );

    expect(Exit.isSuccess(canonical)).toBe(true);
    expect(Exit.isSuccess(anchored)).toBe(true);

    if (!Exit.isSuccess(canonical) || !Exit.isSuccess(anchored)) {
      throw new Error("Expected profile URL parsing to succeed");
    }

    expect(canonical.value).toBe(7_298_897);
    expect(anchored.value).toBe(7_298_897);
  });

  it("rejects non-Margonem profile URLs", () => {
    const exit = Effect.runSyncExit(
      parseMargonemProfileUrl("https://example.com/profile/view,7298897")
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("generates canonical profile URLs from profile ids", () => {
    const exit = Effect.runSyncExit(
      parseMargonemProfileUrl(
        "https://www.margonem.pl/profile/view,7298897#char_1296625,jaruna"
      )
    );

    if (!Exit.isSuccess(exit)) {
      throw new Error("Expected profile URL parsing to succeed");
    }

    expect(toMargonemProfileUrl(exit.value)).toBe(
      "https://www.margonem.pl/profile/view,7298897"
    );
  });
});

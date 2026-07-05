import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { describe, expect, it } from "vitest";

import {
  accountDisplayNameToString,
  parseAccountDisplayName,
} from "./account-display-name.js";

describe("parseAccountDisplayName", () => {
  it("trims and accepts a non-empty account display name", () => {
    const exit = Effect.runSyncExit(parseAccountDisplayName("  informati  "));

    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) {
      throw new Error("Expected display name to be valid");
    }

    expect(accountDisplayNameToString(exit.value)).toBe("informati");
  });

  it("rejects empty and overlong account display names", () => {
    expect(
      Exit.isFailure(Effect.runSyncExit(parseAccountDisplayName("   ")))
    ).toBe(true);
    expect(
      Exit.isFailure(Effect.runSyncExit(parseAccountDisplayName("")))
    ).toBe(true);
    expect(
      Exit.isFailure(
        Effect.runSyncExit(parseAccountDisplayName("a".repeat(81)))
      )
    ).toBe(true);

    const maxName = "a".repeat(80);
    const maxExit = Effect.runSyncExit(parseAccountDisplayName(maxName));

    expect(Exit.isSuccess(maxExit)).toBe(true);
    if (!Exit.isSuccess(maxExit)) {
      throw new Error("Expected 80-char display name to be valid");
    }

    expect(accountDisplayNameToString(maxExit.value)).toBe(maxName);
  });
});

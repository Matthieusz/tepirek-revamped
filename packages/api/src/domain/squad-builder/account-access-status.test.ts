import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vite-plus/test";

import {
  canTransitionAccountAccess,
  inactiveAccountAccessStatuses,
  parseAccountAccessStatus,
} from "./account-access-status.ts";

describe("parseAccountAccessStatus", () => {
  it.effect("accepts known access statuses", () =>
    Effect.gen(function* acceptKnownStatuses() {
      for (const value of ["pending", "accepted", "declined", "revoked"]) {
        expect(yield* parseAccountAccessStatus(value)).toBe(value);
      }
    })
  );

  it.effect("rejects unknown status strings", () =>
    Effect.gen(function* rejectUnknownStatus() {
      const failure = yield* parseAccountAccessStatus("archived").pipe(
        Effect.flip
      );

      expect(failure._tag).toBe("InvalidAccountAccessStatus");
    })
  );
});

describe("canTransitionAccountAccess", () => {
  it("exposes the shared transition policy through the account boundary", () => {
    expect(canTransitionAccountAccess("pending", "accepted")).toBe(true);
    expect(canTransitionAccountAccess("accepted", "pending")).toBe(false);
  });

  it("classifies inactive statuses", () => {
    expect(inactiveAccountAccessStatuses).toEqual(["declined", "revoked"]);
  });
});

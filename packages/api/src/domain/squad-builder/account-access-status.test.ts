import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vitest";

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
  it("allows the invited user to accept or decline a pending invite", () => {
    expect(canTransitionAccountAccess("pending", "accepted")).toBe(true);
    expect(canTransitionAccountAccess("pending", "declined")).toBe(true);
  });

  it("allows the owner to revoke pending or accepted access", () => {
    expect(canTransitionAccountAccess("pending", "revoked")).toBe(true);
    expect(canTransitionAccountAccess("accepted", "revoked")).toBe(true);
  });

  it("allows the owner to re-send a declined or revoked invite", () => {
    expect(canTransitionAccountAccess("declined", "pending")).toBe(true);
    expect(canTransitionAccountAccess("revoked", "pending")).toBe(true);
  });

  it("rejects illegal transitions", () => {
    expect(canTransitionAccountAccess("pending", "pending")).toBe(false);
    expect(canTransitionAccountAccess("accepted", "accepted")).toBe(false);
    expect(canTransitionAccountAccess("accepted", "pending")).toBe(false);
    expect(canTransitionAccountAccess("revoked", "accepted")).toBe(false);
  });

  it("classifies inactive statuses", () => {
    expect(inactiveAccountAccessStatuses).toEqual(["declined", "revoked"]);
  });
});

import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { describe, expect, it } from "vitest";

import {
  canTransitionAccountAccess,
  inactiveAccountAccessStatuses,
  parseAccountAccessStatus,
} from "./account-access-status.js";

describe("parseAccountAccessStatus", () => {
  it("accepts known access statuses", () => {
    for (const value of ["pending", "accepted", "declined", "revoked"]) {
      const exit = Effect.runSyncExit(parseAccountAccessStatus(value));
      expect(Exit.isSuccess(exit)).toBe(true);
    }
  });

  it("rejects unknown status strings", () => {
    const exit = Effect.runSyncExit(parseAccountAccessStatus("archived"));
    expect(Exit.isFailure(exit)).toBe(true);
  });
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

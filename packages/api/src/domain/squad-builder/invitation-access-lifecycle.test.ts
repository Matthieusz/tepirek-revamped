import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vitest";

import {
  invitationAccessTransitionTable,
  transitionInvitationAccess,
} from "./invitation-access-lifecycle.ts";

describe("invitationAccessTransitionTable", () => {
  it("contains the complete invitation/access lifecycle", () => {
    expect(invitationAccessTransitionTable).toEqual({
      accepted: ["revoked"],
      declined: ["pending"],
      pending: ["accepted", "declined", "revoked"],
      revoked: ["pending"],
    });
  });
});

describe("transitionInvitationAccess", () => {
  it.effect("returns the next status for every legal transition", () =>
    Effect.gen(function* applyLegalTransitions() {
      const statuses = ["pending", "accepted", "declined", "revoked"] as const;

      for (const currentStatus of statuses) {
        for (const nextStatus of invitationAccessTransitionTable[
          currentStatus
        ]) {
          expect(
            yield* transitionInvitationAccess(currentStatus, nextStatus)
          ).toBe(nextStatus);
        }
      }
    })
  );

  it.effect("returns a typed failure for an illegal transition", () =>
    Effect.gen(function* rejectIllegalTransition() {
      const failure = yield* transitionInvitationAccess(
        "accepted",
        "pending"
      ).pipe(Effect.flip);

      expect(failure).toMatchObject({
        _tag: "InvitationAccessTransitionNotAllowed",
        attempted: "pending",
        currentStatus: "accepted",
      });
    })
  );
});

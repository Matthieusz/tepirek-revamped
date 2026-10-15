/* eslint-disable anti-slop-effect/no-manual-tagged-construction -- Independent expected values verify output shape, not domain construction. */
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vite-plus/test";

import {
  canTransitionInvitationAccess,
  transitionInvitationAccess,
} from "./invitation-access-lifecycle.ts";

const transitions = [
  ["pending", "pending", false],
  ["pending", "accepted", true],
  ["pending", "declined", true],
  ["pending", "revoked", true],
  ["accepted", "pending", false],
  ["accepted", "accepted", false],
  ["accepted", "declined", false],
  ["accepted", "revoked", true],
  ["declined", "pending", true],
  ["declined", "accepted", false],
  ["declined", "declined", false],
  ["declined", "revoked", false],
  ["revoked", "pending", true],
  ["revoked", "accepted", false],
  ["revoked", "declined", false],
  ["revoked", "revoked", false],
] as const;

describe("invitation access lifecycle", () => {
  for (const [currentStatus, nextStatus, allowed] of transitions) {
    it.effect(
      `${currentStatus} → ${nextStatus}: ${allowed ? "allowed" : "rejected"}`,
      () =>
        Effect.gen(function* checkTransition() {
          expect(canTransitionInvitationAccess(currentStatus, nextStatus)).toBe(
            allowed
          );

          if (allowed) {
            expect(
              yield* transitionInvitationAccess(currentStatus, nextStatus)
            ).toBe(nextStatus);

            return;
          }

          const failure = yield* transitionInvitationAccess(
            currentStatus,
            nextStatus
          ).pipe(Effect.flip);

          expect(failure).toMatchObject({
            _tag: "InvitationAccessTransitionNotAllowed",
            attempted: nextStatus,
            currentStatus,
          });
        })
    );
  }
});

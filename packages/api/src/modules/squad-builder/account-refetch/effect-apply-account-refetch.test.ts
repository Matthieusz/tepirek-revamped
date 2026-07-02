import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import { parseAppUserId } from "../app-user-id.js";
import { isOk } from "../result.js";
import { makeEffectAccountRefetchStoreTestService } from "../squad-groups/effect-squad-group-store.test-support.js";
import { EffectAccountRefetchStore } from "./effect-account-refetch-store.js";
import { EffectApplyAccountRefetch } from "./effect-apply-account-refetch.js";

const parseTestUserId = () => {
  const userId = parseAppUserId("effect-apply-refetch-user");

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const fixedNow = new Date("2026-06-29T12:00:00.000Z");

const fixedClock: Clock = {
  now: () => fixedNow,
};

it.effect("applies a pending account refetch and marks it applied", () => {
  const actorUserId = parseTestUserId();
  const appliedRefetchIds: number[] = [];
  const store = makeEffectAccountRefetchStoreTestService({
    applyRefetchedAccount: (input) => {
      expect(input.now).toBe(fixedNow);
      expect(input.pendingRefetch.accountId).toBe(123);

      return Effect.succeed({
        accountId: input.pendingRefetch.accountId,
        addedCharacterCount: 1,
        lastFetchedAt: input.pendingRefetch.fetchedAt,
        profileId: input.pendingRefetch.profileId,
        removedCharacterCount: 1,
        removedSquadCharacterCount: 2,
        updatedCharacterCount: 1,
      });
    },
    findPendingRefetchForApply: (input) => {
      expect(input.now).toBe(fixedNow);
      expect(input.refetchPreviewId).toBe(456);

      return Effect.succeed({
        accountId: 123 as never,
        actorUserId: input.actorUserId,
        fetchedAt: new Date("2026-06-29T11:55:00.000Z"),
        id: input.refetchPreviewId,
        latestCharacters: [],
        profileId: 7_298_897 as never,
      });
    },
    getAccountForRefetch: (input) =>
      Effect.succeed({
        accountId: input.accountId,
        currentCharacters: [],
        displayName: "apply-refetch" as never,
        profileId: 7_298_897 as never,
      }),
    markPendingRefetchApplied: (input) => {
      expect(input.appliedAt).toBe(fixedNow);
      appliedRefetchIds.push(input.refetchPreviewId);
      return Effect.void;
    },
  });
  const service = new EffectApplyAccountRefetch(fixedClock);

  return Effect.gen(function* applyRefetchEffect() {
    const applied = yield* service.apply({
      actorUserId,
      refetchPreviewId: 456 as never,
    });

    expect(applied).toMatchObject({
      accountId: 123,
      addedCharacterCount: 1,
      removedCharacterCount: 1,
      removedSquadCharacterCount: 2,
      updatedCharacterCount: 1,
    });
    expect(appliedRefetchIds).toEqual([456]);
  }).pipe(Effect.provideService(EffectAccountRefetchStore)(store));
});

import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../app-user-id.js";
import { makeAccountRefetchStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountRefetchStoreService } from "./account-refetch-store-service.js";
import { apply } from "./apply-account-refetch-service.js";

const parseTestUserId = () =>
  Effect.runSync(parseAppUserId("effect-apply-refetch-user"));

const fixedNow = new Date("2026-06-29T12:00:00.000Z");

it.effect("applies a pending account refetch and marks it applied", () => {
  const actorUserId = parseTestUserId();
  const appliedRefetchIds: number[] = [];
  const store = makeAccountRefetchStoreServiceTestService({
    applyRefetchedAccount: (input) => {
      expect(input.now).toEqual(fixedNow);
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
      expect(input.now).toEqual(fixedNow);
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
      expect(input.appliedAt).toEqual(fixedNow);
      appliedRefetchIds.push(input.refetchPreviewId);
      return Effect.void;
    },
  });
  const service = { apply };

  return Effect.gen(function* applyRefetchEffect() {
    yield* TestClock.setTime(fixedNow.getTime());
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
  }).pipe(Effect.provideService(AccountRefetchStoreService)(store));
});

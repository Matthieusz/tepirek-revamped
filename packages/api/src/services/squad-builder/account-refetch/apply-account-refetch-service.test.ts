import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { TestClock } from "effect/testing";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.js";
import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.js";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.js";
import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.js";
import { parsePendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.js";
import { makeAccountRefetchStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountRefetchStoreService } from "./account-refetch-store-service.js";
import { apply } from "./apply-account-refetch-service.js";

const parseTestUserId = () =>
  Effect.runSync(parseAppUserId("effect-apply-refetch-user"));

const fixedNow = new Date("2026-06-29T12:00:00.000Z");

it.effect("applies a pending account refetch and marks it applied", () => {
  const actorUserId = parseTestUserId();
  const accountId = Effect.runSync(parseMargonemAccountId(123));
  const displayName = Effect.runSync(parseAccountDisplayName("apply-refetch"));
  const profileId = Effect.runSync(parseMargonemProfileId(7_298_897));
  const refetchPreviewId = Effect.runSync(
    parsePendingMargonemAccountRefetchId(456)
  );
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
        accountId,
        actorUserId: input.actorUserId,
        fetchedAt: new Date("2026-06-29T11:55:00.000Z"),
        id: input.refetchPreviewId,
        latestCharacters: [],
        profileId,
      });
    },
    getAccountForRefetch: (input) =>
      Effect.succeed({
        accountId: input.accountId,
        currentCharacters: [],
        displayName,
        profileId,
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
      refetchPreviewId,
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

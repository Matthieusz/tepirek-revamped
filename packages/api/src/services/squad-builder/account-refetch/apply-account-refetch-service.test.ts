import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { parsePendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.ts";
import { makeAccountRefetchStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import { AccountRefetchStoreService } from "./account-refetch-store.ts";
import { apply } from "./apply-account-refetch-service.ts";

const parseTestUserId = () =>
  Effect.runSync(parseAppUserId("effect-apply-refetch-user"));

const fixedNow = new Date("2026-06-29T12:00:00.000Z");

it.effect("applies a pending account refetch", () => {
  const actorUserId = parseTestUserId();
  const accountId = Effect.runSync(parseMargonemAccountId(123));
  const profileId = Effect.runSync(parseMargonemProfileId(7_298_897));
  const refetchPreviewId = Effect.runSync(
    parsePendingMargonemAccountRefetchId(456)
  );
  const store = makeAccountRefetchStoreServiceTestService({
    applyPendingRefetch: (input) => {
      expect(input.now).toEqual(fixedNow);
      expect(input.refetchPreviewId).toBe(456);

      return Effect.succeed({
        accountId,
        addedCharacterCount: 1,
        lastFetchedAt: new Date("2026-06-29T11:55:00.000Z"),
        profileId,
        removedCharacterCount: 1,
        removedSquadCharacterCount: 2,
        updatedCharacterCount: 1,
      });
    },
  });

  return Effect.gen(function* applyRefetchEffect() {
    yield* TestClock.setTime(fixedNow.getTime());
    const applied = yield* apply({
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
  }).pipe(Effect.provideService(AccountRefetchStoreService)(store));
});

import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../app-user-id.js";
import { parseMargonemProfileId } from "../margonem-profile-id.js";
import { parsePendingMargonemAccountImportId } from "../pending-margonem-account-import-id.js";
import { isOk } from "../result.js";
import { makeAccountImportStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountImportStoreService } from "./account-import-store-service.js";
import { confirm } from "./confirm-owned-account-import-service.js";
import type { Clock } from "./preview-margonem-profile-import.js";

const parseTestUserId = () => {
  const userId = parseAppUserId("effect-confirm-user");

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestPendingId = () => {
  const id = parsePendingMargonemAccountImportId(42);

  if (!isOk(id)) {
    throw new Error("Expected pending id to be valid");
  }

  return id.value;
};

const parseTestProfileId = () => {
  const profileId = parseMargonemProfileId(7_298_897);

  if (!isOk(profileId)) {
    throw new Error("Expected profile id to be valid");
  }

  return profileId.value;
};

const fixedClock: Clock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

it.effect("confirms a pending owned account import through services", () => {
  const actorUserId = parseTestUserId();
  const pendingImportId = parseTestPendingId();
  const profileId = parseTestProfileId();
  const service = { confirm };
  const store = makeAccountImportStoreServiceTestService({
    createOwnedAccountFromPendingImport: ({ displayName, pending }) =>
      Effect.succeed({
        accountId: 123,
        characterCount: pending.jarunaCharacters.length,
        displayName,
        generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
        lastFetchedAt: pending.fetchedAt,
        profileId: pending.profileId,
      }),
    findPendingImportForConfirmation: () =>
      Effect.succeed({
        actorUserId,
        fetchedAt: new Date("2026-06-29T11:30:00.000Z"),
        id: pendingImportId,
        jarunaCharacters: [
          {
            avatarUrl: null,
            characterId: 1_296_625 as never,
            level: 315 as never,
            name: "informati",
            profession: "tracker",
            world: "jaruna",
          },
        ],
        profileId,
      }),
  });

  return Effect.gen(function* confirmEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const result = yield* service.confirm({
      actorUserId,
      displayName: "  informati  ",
      pendingImportId,
    });

    expect(result).toMatchObject({
      accountId: 123,
      characterCount: 1,
      displayName: "informati",
      profileId,
    });
  }).pipe(Effect.provideService(AccountImportStoreService)(store));
});

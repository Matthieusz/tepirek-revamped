import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.js";
import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.js";
import { parsePendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.js";
import { makeAccountImportStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountImportStoreService } from "./account-import-store-service.js";
import { confirm } from "./confirm-owned-account-import-service.js";
import type { Clock } from "./preview-margonem-profile-import.js";

const parseTestUserId = () =>
  Effect.runSync(parseAppUserId("effect-confirm-user"));

const parseTestPendingId = () =>
  Effect.runSync(parsePendingMargonemAccountImportId(42));

const parseTestProfileId = () =>
  Effect.runSync(parseMargonemProfileId(7_298_897));

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

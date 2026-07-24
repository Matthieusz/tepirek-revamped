import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import {
  parseMargonemCharacterId,
  parseMargonemProfileId,
  parsePositiveLevel,
} from "../../../domain/squad-builder/margonem-profile-id.ts";
import { parsePendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import { makeAccountImportStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
import { confirm } from "./confirm-owned-account-import-service.ts";

const parseTestUserId = () =>
  Effect.runSync(parseAppUserId("effect-confirm-user"));

const parseTestPendingId = () =>
  Effect.runSync(parsePendingMargonemAccountImportId(42));

const parseTestAccountId = () => Effect.runSync(parseMargonemAccountId(123));

const parseTestProfileId = () =>
  Effect.runSync(parseMargonemProfileId(7_298_897));

const FIXED_TIME = new Date("2026-06-29T12:00:00.000Z");

it.effect("confirms a pending owned account import through services", () => {
  const actorUserId = parseTestUserId();
  const pendingImportId = parseTestPendingId();
  const accountId = parseTestAccountId();
  const profileId = parseTestProfileId();
  const characterId = Effect.runSync(parseMargonemCharacterId(1_296_625));
  const level = Effect.runSync(parsePositiveLevel(315));
  const service = { confirm };
  const store = makeAccountImportStoreServiceTestService({
    createOwnedAccountFromPendingImport: ({ displayName, pending }) =>
      Effect.succeed({
        accountId,
        characterCount: pending.jarunaCharacters.length,
        characterPreviews: pending.jarunaCharacters
          .slice(0, 4)
          .map((character) => ({
            avatarUrl: character.avatarUrl,
            characterId: character.characterId,
            name: character.name,
            profession: character.profession,
          })),
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
            characterId,
            level,
            name: "informati",
            profession: "tracker",
            world: "jaruna",
          },
        ],
        profileId,
      }),
  });

  return Effect.gen(function* confirmEffect() {
    yield* TestClock.setTime(FIXED_TIME.getTime());
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

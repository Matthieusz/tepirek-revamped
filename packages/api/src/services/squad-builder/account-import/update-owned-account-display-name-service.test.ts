import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { makeAccountImportStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
import { update } from "./update-owned-account-display-name-service.ts";

it.effect("updates an owned account display name through the store", () => {
  const actorUserId = Effect.runSync(parseAppUserId("rename-user"));
  const accountId = Effect.runSync(parseMargonemAccountId(7));
  const profileId = Effect.runSync(parseMargonemProfileId(7_298_897));
  const store = makeAccountImportStoreServiceTestService({
    updateOwnedAccountDisplayName: ({ displayName }) =>
      Effect.succeed({
        accountId,
        characterCount: 2,
        characterPreviews: [],
        displayName,
        generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
        lastFetchedAt: new Date("2026-07-14T12:00:00.000Z"),
        profileId,
      }),
  });

  return Effect.gen(function* updateAccountDisplayNameTest() {
    const result = yield* update({
      accountId,
      actorUserId,
      displayName: "  Nowa nazwa  ",
    });

    expect(result.displayName).toBe("Nowa nazwa");
  }).pipe(Effect.provideService(AccountImportStoreService)(store));
});

it.effect("rejects an empty account display name before persistence", () => {
  const actorUserId = Effect.runSync(parseAppUserId("rename-user"));
  const accountId = Effect.runSync(parseMargonemAccountId(7));
  const store = makeAccountImportStoreServiceTestService({
    updateOwnedAccountDisplayName: () =>
      Effect.die(new Error("The store should not be called")),
  });

  return update({ accountId, actorUserId, displayName: "   " }).pipe(
    Effect.provideService(AccountImportStoreService)(store),
    Effect.flip,
    Effect.map((error) => {
      expect(error._tag).toBe("InvalidAccountDisplayName");
      return null;
    })
  );
});

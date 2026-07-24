import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { makeAccountImportStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
import { deleteOwnedAccount } from "./delete-owned-account-service.ts";

it.effect("deletes an owned account and returns its impact counts", () => {
  const actorUserId = Effect.runSync(parseAppUserId("delete-user"));
  const accountId = Effect.runSync(parseMargonemAccountId(7));
  const store = makeAccountImportStoreServiceTestService({
    deleteOwnedAccount: () =>
      Effect.succeed({
        accountId,
        removedAccessGrantCount: 2,
        removedCharacterCount: 5,
        removedSquadCharacterCount: 3,
      }),
  });

  return Effect.gen(function* deleteOwnedAccountTest() {
    const result = yield* deleteOwnedAccount({ accountId, actorUserId });

    expect(result).toEqual({
      accountId,
      removedAccessGrantCount: 2,
      removedCharacterCount: 5,
      removedSquadCharacterCount: 3,
    });
  }).pipe(Effect.provideService(AccountImportStoreService)(store));
});

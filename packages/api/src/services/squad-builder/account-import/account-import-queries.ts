import * as Effect from "effect/Effect";

import { AccountImportStoreService } from "./account-import-store.ts";

/** Delete an owned imported account after enforcing ownership in the port. */
export const deleteOwnedAccount = Effect.fn("AccountImport.deleteOwnedAccount")(
  function* deleteOwnedAccount(
    input: Parameters<
      (typeof AccountImportStoreService.Service)["deleteOwnedAccount"]
    >[0]
  ) {
    const store = yield* AccountImportStoreService;
    return yield* store.deleteOwnedAccount(input);
  }
);

/** List the accounts owned by the current application user. */
export const listOwnedAccounts = Effect.fn("AccountImport.listOwnedAccounts")(
  function* listOwnedAccounts(
    input: Parameters<
      (typeof AccountImportStoreService.Service)["listOwnedAccounts"]
    >[0]
  ) {
    const store = yield* AccountImportStoreService;
    return yield* store.listOwnedAccounts(input);
  }
);

import * as Effect from "effect/Effect";

import type { AppUserId } from "../app-user-id.js";
import { AccountImportStoreService } from "./account-import-store-service.js";
import type { SquadBuilderPersistenceUnavailable } from "./account-import-store.js";

/** Input for listing owned Margonem accounts. */
export interface ListOwnedMargonemAccountsInput {
  readonly actorUserId: AppUserId;
}

/** Expected failures returned by the list owned accounts service. */
export type ListOwnedMargonemAccountsError = SquadBuilderPersistenceUnavailable;

/** List Margonem accounts owned by the actor. */
export const list = Effect.fn("AccountImport.listOwnedAccounts")(
  (input: ListOwnedMargonemAccountsInput) =>
    AccountImportStoreService.use((store) =>
      store.listOwnedAccounts({
        actorUserId: input.actorUserId,
      })
    )
);

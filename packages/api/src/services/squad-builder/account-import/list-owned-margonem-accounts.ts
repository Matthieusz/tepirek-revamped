import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { AccountImportStoreService } from "./account-import-store-service.ts";
import type { SquadBuilderPersistenceUnavailable } from "./account-import-store.ts";

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

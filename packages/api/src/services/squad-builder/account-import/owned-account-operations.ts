import type {
  DeleteOwnedAccountInput,
  ListOwnedMargonemAccountsInput,
} from "./account-import-store.ts";
import { AccountImportStoreService } from "./account-import-store.ts";

/** List Margonem accounts owned by the actor. */
export const listOwnedAccounts = (input: ListOwnedMargonemAccountsInput) =>
  AccountImportStoreService.use((store) => store.listOwnedAccounts(input));

/** Permanently delete an owned account and its linked data. */
export const deleteOwnedAccount = (input: DeleteOwnedAccountInput) =>
  AccountImportStoreService.use((store) => store.deleteOwnedAccount(input));

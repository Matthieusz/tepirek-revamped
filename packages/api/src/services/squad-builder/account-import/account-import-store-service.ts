import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type {
  ActorDoesNotOwnMargonemAccount,
  EffectSquadBuilderPersistenceUnavailable,
  MargonemAccountNotFound,
  PendingMargonemAccountImportNotFound,
} from "../squad-groups/squad-group-errors.ts";
import type {
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  DeleteOwnedAccountInput,
  DeleteOwnedAccountResult,
  DuplicateMargonemAccountError,
  FindPendingMargonemAccountImportInput,
  FindProfileAccessStateInput,
  ListOwnedMargonemAccountsInput,
  OwnedMargonemAccountSummary,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportForConfirmation,
  ProfileAccessState,
  UpdateOwnedAccountDisplayNameInput,
} from "./account-import-store.ts";

/** Persistence operations used by account import workflows. */
export interface AccountImportStoreServiceShape {
  readonly listOwnedAccounts: (
    input: ListOwnedMargonemAccountsInput
  ) => Effect<
    readonly OwnedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly updateOwnedAccountDisplayName: (
    input: UpdateOwnedAccountDisplayNameInput
  ) => Effect<
    OwnedMargonemAccountSummary,
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly deleteOwnedAccount: (
    input: DeleteOwnedAccountInput
  ) => Effect<
    DeleteOwnedAccountResult,
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly findProfileAccessState: (
    input: FindProfileAccessStateInput
  ) => Effect<ProfileAccessState, EffectSquadBuilderPersistenceUnavailable>;
  readonly createPendingImport: (
    input: CreatePendingMargonemAccountImportInput
  ) => Effect<
    PendingMargonemAccountImport,
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly findPendingImportForConfirmation: (
    input: FindPendingMargonemAccountImportInput
  ) => Effect<
    PendingMargonemAccountImportForConfirmation,
    | PendingMargonemAccountImportNotFound
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly createOwnedAccountFromPendingImport: (
    input: CreateOwnedAccountFromPendingImportInput
  ) => Effect<
    OwnedMargonemAccountSummary,
    DuplicateMargonemAccountError | EffectSquadBuilderPersistenceUnavailable
  >;
}

export class AccountImportStoreService extends Context.Service<
  AccountImportStoreService,
  AccountImportStoreServiceShape
>()("@tepirek-revamped/api/squad-builder/AccountImportStoreService") {}

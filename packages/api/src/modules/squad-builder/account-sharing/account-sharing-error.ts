import type { InvalidAppUserId } from "../app-user-id";
import type { InvalidMargonemAccountAccessId } from "../margonem-account-access-id";
import type { InvalidMargonemAccountId } from "../margonem-account-id";
import type {
  AccountSharingAuthorizationError,
  AccountSharingStore,
  SquadBuilderPersistenceUnavailable,
} from "./account-sharing-store";
import type { InvalidAccountInviteTargetQuery } from "./search-account-invite-targets";

export type { AccountSharingStore, SquadBuilderPersistenceUnavailable };

/** All expected failures for account sharing services. */
export type AccountSharingError =
  | AccountSharingAuthorizationError
  | InvalidMargonemAccountId
  | InvalidMargonemAccountAccessId
  | InvalidAppUserId
  | InvalidAccountInviteTargetQuery
  | SquadBuilderPersistenceUnavailable;

import type { InvalidAppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { InvalidAccountInviteTargetQuery } from "../../../domain/squad-builder/invite-target-search.js";
import type { InvalidMargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.js";
import type { InvalidMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.js";
import type {
  AccountSharingAuthorizationError,
  AccountSharingStore,
  SquadBuilderPersistenceUnavailable,
} from "./account-sharing-store.js";

export type { AccountSharingStore, SquadBuilderPersistenceUnavailable };

/** All expected failures for account sharing services. */
export type AccountSharingError =
  | AccountSharingAuthorizationError
  | InvalidMargonemAccountId
  | InvalidMargonemAccountAccessId
  | InvalidAppUserId
  | InvalidAccountInviteTargetQuery
  | SquadBuilderPersistenceUnavailable;

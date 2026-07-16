import type { InvalidAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { InvalidAccountInviteTargetQuery } from "../../../domain/squad-builder/invite-target-search.ts";
import type { InvalidMargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import type { InvalidMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type {
  AccountSharingAuthorizationError,
  SquadBuilderPersistenceUnavailable,
} from "./account-sharing-store.ts";

export type { SquadBuilderPersistenceUnavailable };

/** All expected failures for account sharing services. */
export type AccountSharingError =
  | AccountSharingAuthorizationError
  | InvalidMargonemAccountId
  | InvalidMargonemAccountAccessId
  | InvalidAppUserId
  | InvalidAccountInviteTargetQuery
  | SquadBuilderPersistenceUnavailable;

import type { InvalidAccountInviteTargetQuery } from "../account-sharing/search-account-invite-targets";
import type { InvalidAppUserId } from "../app-user-id";
import type { InvalidSquadGroupId } from "../squad-group-id";
import type { InvalidSquadGroupInvitationId } from "../squad-group-invitation-id";
import type { InvalidSquadId } from "../squad-id";
import type { SharedSquadGroupSaveError } from "./save-shared-squad-group-characters";
import type {
  SquadBuilderPersistenceUnavailable,
  SquadGroupSharingAuthorizationError,
  SquadGroupSharingStore,
} from "./squad-group-store";

export type { SquadBuilderPersistenceUnavailable, SquadGroupSharingStore };

/** All expected failures for squad group sharing services. */
export type SquadGroupSharingError =
  | SquadGroupSharingAuthorizationError
  | InvalidAppUserId
  | InvalidSquadGroupId
  | InvalidSquadGroupInvitationId
  | InvalidSquadId
  | InvalidAccountInviteTargetQuery
  | SharedSquadGroupSaveError
  | SquadBuilderPersistenceUnavailable;

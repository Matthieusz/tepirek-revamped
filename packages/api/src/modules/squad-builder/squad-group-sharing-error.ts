import type { InvalidAppUserId } from "./app-user-id";
import type { SharedSquadGroupSaveError } from "./save-shared-squad-group-characters";
import type { InvalidAccountInviteTargetQuery } from "./search-account-invite-targets";
import type {
  SquadBuilderPersistenceUnavailable,
  SquadGroupSharingAuthorizationError,
  SquadGroupSharingStore,
} from "./squad-builder-store";
import type { InvalidSquadGroupId } from "./squad-group-id";
import type { InvalidSquadGroupInvitationId } from "./squad-group-invitation-id";
import type { InvalidSquadId } from "./squad-id";

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

import type { SquadBuilderPersistenceUnavailable } from "../account-import/account-import-store.js";
import type { InvalidAccountInviteTargetQuery } from "../account-sharing/search-account-invite-targets.js";
import type { InvalidAppUserId } from "../app-user-id.js";
import type { InvalidSquadGroupId } from "../squad-group-id.js";
import type { InvalidSquadGroupInvitationId } from "../squad-group-invitation-id.js";
import type { InvalidSquadId } from "../squad-id.js";
import type { SharedSquadGroupSaveError } from "./save-shared-squad-group-characters.js";
import type { SquadGroupSharingAuthorizationError } from "./squad-group-store.js";

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

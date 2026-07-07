import type { InvalidAppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { InvalidSquadGroupId } from "../../../domain/squad-builder/squad-group-id.js";
import type { InvalidSquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.js";
import type { InvalidSquadId } from "../../../domain/squad-builder/squad-id.js";
import type { SquadBuilderPersistenceUnavailable } from "../account-import/account-import-store.js";
import type { InvalidAccountInviteTargetQuery } from "../account-sharing/search-account-invite-targets.js";
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

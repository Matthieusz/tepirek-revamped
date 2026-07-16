import type { InvalidAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { InvalidAccountInviteTargetQuery } from "../../../domain/squad-builder/invite-target-search.ts";
import type { InvalidSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { InvalidSquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import type { InvalidSquadId } from "../../../domain/squad-builder/squad-id.ts";
import type { SquadBuilderPersistenceUnavailable } from "../account-import/account-import-store.ts";
import type { SharedSquadGroupSaveError } from "./save-shared-squad-group-characters.ts";
import type { SquadGroupSharingAuthorizationError } from "./squad-group-store.ts";

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

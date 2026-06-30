import type { AppUserId } from "./app-user-id";
import type { SquadGroupId } from "./squad-group-id";
import type { SquadGroupInvitationId } from "./squad-group-invitation-id";

/** Access role within a squad group. */
export type SquadGroupAccessRole = "owner" | "editor" | "viewer";

/** Full owner access to a squad group. */
export interface SquadGroupOwnerAccess {
  readonly _tag: "SquadGroupOwnerAccess";
  readonly role: "owner";
  readonly groupId: SquadGroupId;
  readonly ownerUserId: AppUserId;
}

/** Editor access granted through an accepted squad group invitation. */
export interface SquadGroupEditorAccess {
  readonly _tag: "SquadGroupEditorAccess";
  readonly role: "editor";
  readonly groupId: SquadGroupId;
  readonly ownerUserId: AppUserId;
  readonly editorUserId: AppUserId;
  readonly invitationId: SquadGroupInvitationId;
}

/** Read-only access granted by global squad group visibility. */
export interface SquadGroupViewerAccess {
  readonly _tag: "SquadGroupViewerAccess";
  readonly role: "viewer";
  readonly groupId: SquadGroupId;
  readonly ownerUserId: AppUserId;
}

/** Union of all squad group access levels. */
export type SquadGroupAccess =
  | SquadGroupOwnerAccess
  | SquadGroupEditorAccess
  | SquadGroupViewerAccess;

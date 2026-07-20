import * as Data from "effect/Data";

import type { AppUserId } from "./app-user-id.ts";
import type { SquadGroupId } from "./squad-group-id.ts";
import type { SquadGroupInvitationId } from "./squad-group-invitation-id.ts";

/** Access role within a squad group. */
export type SquadGroupAccessRole = "owner" | "editor" | "viewer";

/** Full owner access to a squad group. */
export type SquadGroupAccess = Data.TaggedEnum<{
  readonly SquadGroupOwnerAccess: {
    readonly role: "owner";
    readonly groupId: SquadGroupId;
    readonly ownerUserId: AppUserId;
  };
  readonly SquadGroupEditorAccess: {
    readonly role: "editor";
    readonly groupId: SquadGroupId;
    readonly ownerUserId: AppUserId;
    readonly editorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
  };
  readonly SquadGroupViewerAccess: {
    readonly role: "viewer";
    readonly groupId: SquadGroupId;
    readonly ownerUserId: AppUserId;
  };
}>;
export const SquadGroupAccess = Data.taggedEnum<SquadGroupAccess>();
export type SquadGroupOwnerAccess = Data.TaggedEnum.Value<
  SquadGroupAccess,
  "SquadGroupOwnerAccess"
>;

/** Editor access granted through an accepted squad group invitation. */
export type SquadGroupEditorAccess = Data.TaggedEnum.Value<
  SquadGroupAccess,
  "SquadGroupEditorAccess"
>;

/** Read-only access granted by global squad group visibility. */
export type SquadGroupViewerAccess = Data.TaggedEnum.Value<
  SquadGroupAccess,
  "SquadGroupViewerAccess"
>;

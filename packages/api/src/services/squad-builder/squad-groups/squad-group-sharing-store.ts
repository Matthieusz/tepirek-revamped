import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupOwnerAccess } from "../../../domain/squad-builder/squad-group-access.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { SquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import type { SquadGroupInvitationStatus } from "../../../domain/squad-builder/squad-group-invitation-status.ts";
import type { SquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import type {
  SharedSquadGroupCharactersSnapshot,
  SquadGroupValidationError,
} from "../../../domain/squad-builder/squad-group-snapshot.ts";
import type { SquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import type { SquadGroupDetail } from "./squad-group-aggregate-store.ts";
import type {
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  ActorIsNotSquadGroupInviteRecipient,
  EditorCannotChangeSquadStructure,
  SquadBuilderPersistenceUnavailable,
  SquadGroupInvitationNotFound,
  SquadGroupInvitationTransitionNotAllowed,
  SquadGroupNotFound,
  SquadGroupWriteConflict,
  SquadNotInGroup,
} from "./squad-group-errors.ts";

/** Summary row for an incoming squad group invitation. */
export interface SquadGroupInvitationSummary {
  readonly invitationId: SquadGroupInvitationId;
  readonly squadGroupId: SquadGroupId;
  readonly squadGroupName: SquadGroupName;
  readonly ownerUserId: AppUserId;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly status: SquadGroupInvitationStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Summary row for a squad group shared with the actor. */
export interface SharedSquadGroupSummary {
  readonly groupId: SquadGroupId;
  readonly name: SquadGroupName;
  readonly ownerUserId: AppUserId;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly squadCount: number;
  readonly characterCount: number;
  readonly updatedAt: Date;
}

/** Summary row for a squad group owner's grant list. */
export interface SquadGroupEditorGrantSummary {
  readonly invitationId: SquadGroupInvitationId;
  readonly userId: AppUserId;
  readonly userName: string;
  readonly userImage: string | null;
  readonly status: Extract<SquadGroupInvitationStatus, "pending" | "accepted">;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Store input for saving character placements in a shared group. */
export interface SaveSharedSquadGroupCharactersStoreInput {
  readonly actorUserId: AppUserId;
  readonly expectedUpdatedAt: Date;
  readonly groupId: SquadGroupId;
  readonly snapshot: SharedSquadGroupCharactersSnapshot;
  readonly now: Date;
}

/** Store input for upserting a squad group editor invitation. */
export interface UpsertSquadGroupEditorInviteInput {
  readonly groupId: SquadGroupId;
  readonly ownerUserId: AppUserId;
  readonly invitedUserId: AppUserId;
  readonly now: Date;
}

/** Store input for responding to a squad group invitation. */
export interface RespondToSquadGroupInviteStoreInput {
  readonly invitationId: SquadGroupInvitationId;
  readonly invitedUserId: AppUserId;
  readonly response: "accept" | "decline";
  readonly now: Date;
}

/** Store input for revoking a squad group editor invitation. */
export interface RevokeSquadGroupEditorStoreInput {
  readonly invitationId: SquadGroupInvitationId;
  readonly ownerUserId: AppUserId;
  readonly now: Date;
}

/** Persistence port for group sharing, authorization, and invitations. */
export interface SquadGroupSharingStoreContract {
  readonly authorizeSquadGroupOwner: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Effect<
    SquadGroupOwnerAccess,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadBuilderPersistenceUnavailable
  >;
  readonly saveSharedSquadGroupCharacters: (
    input: SaveSharedSquadGroupCharactersStoreInput
  ) => Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorCannotViewSquadGroup
    | ActorCannotEditSquadGroup
    | SquadNotInGroup
    | EditorCannotChangeSquadStructure
    | SquadGroupValidationError
    | SquadGroupWriteConflict
    | SquadBuilderPersistenceUnavailable
  >;
  readonly upsertSquadGroupEditorInvite: (
    input: UpsertSquadGroupEditorInviteInput
  ) => Effect<
    SquadGroupInvitationSummary,
    | SquadGroupInvitationTransitionNotAllowed
    | SquadBuilderPersistenceUnavailable
  >;
  readonly respondToSquadGroupInvite: (
    input: RespondToSquadGroupInviteStoreInput
  ) => Effect<
    SquadGroupInvitationSummary,
    | SquadGroupInvitationNotFound
    | ActorIsNotSquadGroupInviteRecipient
    | SquadGroupInvitationTransitionNotAllowed
    | SquadBuilderPersistenceUnavailable
  >;
  readonly revokeSquadGroupEditor: (
    input: RevokeSquadGroupEditorStoreInput
  ) => Effect<
    SquadGroupInvitationSummary,
    | SquadGroupInvitationNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadGroupInvitationTransitionNotAllowed
    | SquadBuilderPersistenceUnavailable
  >;
  readonly listIncomingSquadGroupInvites: (input: {
    readonly actorUserId: AppUserId;
  }) => Effect<
    readonly SquadGroupInvitationSummary[],
    SquadBuilderPersistenceUnavailable
  >;
  readonly getPendingSquadGroupInviteCount: (input: {
    readonly actorUserId: AppUserId;
  }) => Effect<number, SquadBuilderPersistenceUnavailable>;
  readonly listSharedSquadGroups: (input: {
    readonly actorUserId: AppUserId;
    readonly filters: SquadGroupListFilters;
  }) => Effect<
    readonly SharedSquadGroupSummary[],
    SquadBuilderPersistenceUnavailable
  >;
  readonly listSquadGroupEditorGrants: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Effect<
    readonly SquadGroupEditorGrantSummary[],
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadBuilderPersistenceUnavailable
  >;
}

/** Sharing and invitation access for squad groups. */
export class SquadGroupSharingStoreService extends Context.Service<
  SquadGroupSharingStoreService,
  SquadGroupSharingStoreContract
>()("@tepirek-revamped/api/squad-builder/SquadGroupSharingStoreService") {}

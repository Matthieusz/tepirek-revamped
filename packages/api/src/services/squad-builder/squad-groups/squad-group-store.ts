import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { AccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type { MargonemProfession } from "../../../domain/squad-builder/margonem-character.ts";
import type {
  SquadGroupAccessRole,
  SquadGroupOwnerAccess,
} from "../../../domain/squad-builder/squad-group-access.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { SquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import type { SquadGroupInvitationStatus } from "../../../domain/squad-builder/squad-group-invitation-status.ts";
import type { SquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import type {
  AvailableSquadCharacter,
  SquadGroupDraftSnapshot,
} from "../../../domain/squad-builder/squad-group-snapshot.ts";
import type { SquadGroupVisibility } from "../../../domain/squad-builder/squad-group-visibility.ts";
import type { SquadId } from "../../../domain/squad-builder/squad-id.ts";
import type { SquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import type { SharedSquadGroupCharactersSnapshot } from "./save-shared-squad-group-characters.ts";
import type {
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  ActorIsNotSquadGroupInviteRecipient,
  EditorCannotChangeSquadStructure,
  SquadBuilderPersistenceUnavailable,
  SquadCharacterNotAccessible,
  SquadEditorInviteTargetNotFound,
  SquadEditorInviteTargetNotVerified,
  SquadGroupInvitationNotFound,
  SquadGroupInvitationTransitionNotAllowed,
  SquadGroupNotFound,
  SquadGroupWriteConflict,
  SquadNotInGroup,
} from "./squad-group-errors.ts";

/** Summary row for a squad group list. */
export interface SquadGroupSummary {
  readonly groupId: SquadGroupId;
  readonly name: SquadGroupName;
  readonly squadCount: number;
  readonly characterCount: number;
  readonly updatedAt: Date;
}

/** Character placement shown in a saved squad group detail. */
export interface SquadGroupCharacter {
  readonly placementId: number;
  readonly characterId: number;
  readonly margonemCharacterId: number;
  readonly accountId: MargonemAccountId;
  readonly accountDisplayName: AccountDisplayName;
  readonly accountOwnerUserName: string;
  readonly accountOwnerUserImage: string | null;
  readonly name: string;
  readonly level: number;
  readonly profession: MargonemProfession;
  readonly avatarUrl: string | null;
  readonly position: number;
}

/** Saved squad shown in a squad group detail. */
interface SquadDetail {
  readonly squadId: SquadId;
  readonly name: string;
  readonly position: number;
  readonly characters: readonly SquadGroupCharacter[];
}

/** Full saved squad group detail. */
interface SquadGroupDetail {
  readonly accessRole: SquadGroupAccessRole;
  readonly groupId: SquadGroupId;
  readonly name: string;
  readonly ownerUserId: AppUserId;
  readonly visibility: SquadGroupVisibility;
  readonly updatedAt: Date;
  readonly squads: readonly SquadDetail[];
}

/** Read model for a squad editor invite search result. */
export interface SquadEditorInviteTarget {
  readonly userId: AppUserId;
  readonly name: string;
  readonly image: string | null;
}

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

/** Summary row for squad group owner's grant list. */
export interface SquadGroupEditorGrantSummary {
  readonly invitationId: SquadGroupInvitationId;
  readonly userId: AppUserId;
  readonly userName: string;
  readonly userImage: string | null;
  readonly status: Extract<SquadGroupInvitationStatus, "pending" | "accepted">;
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

/** Summary row for a globally visible squad group. */
export interface GlobalSquadGroupSummary {
  readonly groupId: SquadGroupId;
  readonly name: SquadGroupName;
  readonly ownerUserId: AppUserId;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly squadCount: number;
  readonly characterCount: number;
  readonly updatedAt: Date;
}

/** Store input for changing squad group visibility. */
export interface SetSquadGroupVisibilityStoreInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly visibility: SquadGroupVisibility;
  readonly now: Date;
}

/** Result of changing squad group visibility. */
interface SquadGroupVisibilityChange {
  readonly groupId: SquadGroupId;
  readonly visibility: SquadGroupVisibility;
  readonly updatedAt: Date;
}

/** Store input for listing global squad groups. */
export interface ListGlobalSquadGroupsInput {
  readonly actorUserId: AppUserId;
  readonly filters: SquadGroupListFilters;
  readonly limit: number;
}

/** Store input for creating a squad group. */
export interface CreateSquadGroupStoreInput {
  readonly actorUserId: AppUserId;
  readonly name: SquadGroupName;
}

/** Store input for permanently deleting an owned squad group. */
export interface DeleteSquadGroupStoreInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}

/** Store input for listing actor-owned squad groups. */
export interface ListMySquadGroupsInput {
  readonly actorUserId: AppUserId;
}

/** Store input for loading a squad group detail. */
export interface GetSquadGroupDetailInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}

/** Store input for listing available characters for a group owner. */
export interface ListAvailableCharactersForOwnerInput {
  readonly ownerUserId: AppUserId;
}

/** Store input for saving a parsed squad group snapshot. */
export interface SaveSquadGroupSnapshotStoreInput {
  readonly actorUserId: AppUserId;
  readonly expectedUpdatedAt: Date;
  readonly snapshot: SquadGroupDraftSnapshot;
  readonly availableCharacters: readonly AvailableSquadCharacter[];
  readonly now: Date;
}

/** Store input for searching squad editor invite targets. */
export interface SearchSquadEditorInviteTargetsStoreInput {
  readonly groupId: SquadGroupId;
  readonly ownerUserId: AppUserId;
  readonly query: string;
  readonly maxResults: number;
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

/** Store input for saving shared squad group characters. */
export interface SaveSharedSquadGroupCharactersStoreInput {
  readonly actorUserId: AppUserId;
  readonly expectedUpdatedAt: Date;
  readonly groupId: SquadGroupId;
  readonly snapshot: SharedSquadGroupCharactersSnapshot;
  readonly now: Date;
}

export interface SquadGroupStoreServiceShape {
  readonly createSquadGroup: (
    input: CreateSquadGroupStoreInput
  ) => Effect<SquadGroupSummary, SquadBuilderPersistenceUnavailable>;
  readonly deleteSquadGroup: (
    input: DeleteSquadGroupStoreInput
  ) => Effect<
    void,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadBuilderPersistenceUnavailable
  >;
  readonly listMySquadGroups: (
    input: ListMySquadGroupsInput
  ) => Effect<readonly SquadGroupSummary[], SquadBuilderPersistenceUnavailable>;
  readonly getSquadGroupDetail: (
    input: GetSquadGroupDetailInput
  ) => Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorCannotViewSquadGroup
    | SquadBuilderPersistenceUnavailable
  >;
  readonly listAvailableCharactersForOwner: (
    input: ListAvailableCharactersForOwnerInput
  ) => Effect<
    readonly AvailableSquadCharacter[],
    SquadBuilderPersistenceUnavailable
  >;
  readonly saveSquadGroupSnapshot: (
    input: SaveSquadGroupSnapshotStoreInput
  ) => Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadGroupWriteConflict
    | SquadBuilderPersistenceUnavailable
  >;
  readonly saveSharedSquadGroupCharacters: (
    input: SaveSharedSquadGroupCharactersStoreInput
  ) => Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorCannotEditSquadGroup
    | SquadNotInGroup
    | EditorCannotChangeSquadStructure
    | SquadCharacterNotAccessible
    | SquadGroupWriteConflict
    | SquadBuilderPersistenceUnavailable
  >;
  readonly listGlobalSquadGroups: (
    input: ListGlobalSquadGroupsInput
  ) => Effect<
    readonly GlobalSquadGroupSummary[],
    SquadBuilderPersistenceUnavailable
  >;
  readonly setSquadGroupVisibility: (
    input: SetSquadGroupVisibilityStoreInput
  ) => Effect<
    SquadGroupVisibilityChange,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadBuilderPersistenceUnavailable
  >;
  readonly authorizeSquadGroupOwner: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Effect<
    SquadGroupOwnerAccess,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadBuilderPersistenceUnavailable
  >;
  readonly searchSquadEditorInviteTargets: (
    input: SearchSquadEditorInviteTargetsStoreInput
  ) => Effect<
    readonly SquadEditorInviteTarget[],
    SquadBuilderPersistenceUnavailable
  >;
  readonly findVerifiedSquadEditorInviteTarget: (input: {
    readonly targetUserId: AppUserId;
  }) => Effect<
    SquadEditorInviteTarget,
    | SquadEditorInviteTargetNotFound
    | SquadEditorInviteTargetNotVerified
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
    readonly filters: ListGlobalSquadGroupsInput["filters"];
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

export type { AvailableSquadCharacter };

export class SquadGroupStoreService extends Context.Service<
  SquadGroupStoreService,
  SquadGroupStoreServiceShape
>()("@tepirek-revamped/api/squad-builder/SquadGroupStoreService") {}

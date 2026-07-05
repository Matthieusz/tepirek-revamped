import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { AccountDisplayName } from "../account-display-name.js";
import type {
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  DuplicateMargonemAccountError,
  FindPendingMargonemAccountImportInput,
  FindProfileAccessStateInput,
  FirecrawlBudgetError,
  ListOwnedMargonemAccountsInput,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  OwnedMargonemAccountSummary,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportForConfirmation,
  ProfileAccessState,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
} from "../account-import/account-import-store.js";
import type {
  ApplyRefetchedAccountInput,
  CreatePendingMargonemAccountRefetchInput,
  MarkPendingMargonemAccountRefetchAppliedInput,
  PendingMargonemAccountRefetch,
  PendingMargonemAccountRefetchForApply,
  RefetchableMargonemAccount,
} from "../account-refetch/account-refetch-store.js";
import type { ApplyAccountRefetchOutput } from "../account-refetch/apply-account-refetch.js";
import type {
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  AccountInviteTarget,
  FindOwnedAccountForSharingInput,
  FindVerifiedInviteTargetInput,
  ListAccountAccessGrantsInput,
  ListIncomingAccountInvitesInput,
  ListSharedAccountsInput,
  OwnedAccountForSharing,
  RespondToAccountAccessInviteStoreInput,
  RevokeAccountAccessResult,
  RevokeAccountAccessStoreInput,
  SearchInviteTargetsStoreInput,
  SharedMargonemAccountSummary,
  UpsertAccountAccessInviteInput,
  VerifiedInviteTarget,
} from "../account-sharing/account-sharing-store.js";
import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import type { MargonemProfession } from "../margonem-character.js";
import type {
  SquadGroupAccessRole,
  SquadGroupOwnerAccess,
} from "../squad-group-access.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type { SquadGroupInvitationId } from "../squad-group-invitation-id.js";
import type { SquadGroupInvitationStatus } from "../squad-group-invitation-status.js";
import type { SquadGroupListFilters } from "../squad-group-list-filters.js";
import type {
  AvailableSquadCharacter,
  SquadGroupDraftSnapshot,
} from "../squad-group-snapshot.js";
import type { SquadGroupVisibility } from "../squad-group-visibility.js";
import type { SquadId } from "../squad-id.js";
import type { SquadGroupName } from "../squad-name.js";
import type { SharedSquadGroupCharactersSnapshot } from "./save-shared-squad-group-characters.js";
import type {
  AccountAccessInviteNotFound,
  AccountAccessTransitionNotAllowed,
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnMargonemAccount,
  ActorDoesNotOwnSquadGroup,
  ActorIsNotInviteRecipient,
  ActorIsNotSquadGroupInviteRecipient,
  EditorCannotChangeSquadStructure,
  EffectSquadBuilderPersistenceUnavailable,
  InviteTargetNotFound,
  InviteTargetNotVerified,
  MargonemAccountNotFound,
  PendingMargonemAccountImportNotFound,
  PendingMargonemAccountRefetchNotFound,
  SquadCharacterNotAccessible,
  SquadEditorInviteTargetNotFound,
  SquadEditorInviteTargetNotVerified,
  SquadGroupInvitationNotFound,
  SquadGroupInvitationTransitionNotAllowed,
  SquadGroupNotFound,
  SquadNotInGroup,
} from "./squad-group-errors.js";

export type {
  AccountAccessInviteNotFound,
  AccountAccessTransitionNotAllowed,
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnMargonemAccount,
  ActorDoesNotOwnSquadGroup,
  ActorIsNotInviteRecipient,
  ActorIsNotSquadGroupInviteRecipient,
  EditorCannotChangeSquadStructure,
  InviteTargetNotFound,
  InviteTargetNotVerified,
  MargonemAccountNotFound,
  PendingMargonemAccountImportNotFound,
  PendingMargonemAccountRefetchNotFound,
  SquadCharacterNotAccessible,
  SquadEditorInviteTargetNotFound,
  SquadEditorInviteTargetNotVerified,
  SquadGroupInvitationNotFound,
  SquadGroupInvitationTransitionNotAllowed,
  SquadGroupNotFound,
  SquadNotInGroup,
} from "./squad-group-errors.js";

/** Expected authorization failures for squad group sharing operations. */
export type SquadGroupSharingAuthorizationError =
  | SquadGroupNotFound
  | ActorDoesNotOwnSquadGroup
  | ActorCannotViewSquadGroup
  | ActorCannotEditSquadGroup
  | { readonly _tag: "CannotInviteSelf" }
  | { readonly _tag: "SquadEditorInviteTargetNotFound" }
  | { readonly _tag: "SquadEditorInviteTargetNotVerified" }
  | { readonly _tag: "SquadGroupInvitationNotFound" }
  | { readonly _tag: "ActorIsNotSquadGroupInviteRecipient" }
  | {
      readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
      readonly currentStatus: SquadGroupInvitationStatus;
      readonly attempted: string;
    };

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
export interface SquadDetail {
  readonly squadId: SquadId;
  readonly name: string;
  readonly position: number;
  readonly characters: readonly SquadGroupCharacter[];
}

/** Full saved squad group detail. */
export interface SquadGroupDetail {
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
export interface SquadGroupVisibilityChange {
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

/** Store input for authorizing squad group viewer access. */
export interface AuthorizeSquadGroupViewerInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}

/** Store input for creating a squad group. */
export interface CreateSquadGroupStoreInput {
  readonly actorUserId: AppUserId;
  readonly name: SquadGroupName;
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
  readonly groupId: SquadGroupId;
  readonly snapshot: SharedSquadGroupCharactersSnapshot;
  readonly now: Date;
}

export interface SquadBuilderStoreServiceShape {
  readonly createSquadGroup: (
    input: CreateSquadGroupStoreInput
  ) => Effect<SquadGroupSummary, EffectSquadBuilderPersistenceUnavailable>;
  readonly listMySquadGroups: (
    input: ListMySquadGroupsInput
  ) => Effect<
    readonly SquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly getSquadGroupDetail: (
    input: GetSquadGroupDetailInput
  ) => Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorCannotViewSquadGroup
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly listAvailableCharactersForOwner: (
    input: ListAvailableCharactersForOwnerInput
  ) => Effect<
    readonly AvailableSquadCharacter[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly saveSquadGroupSnapshot: (
    input: SaveSquadGroupSnapshotStoreInput
  ) => Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable
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
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly listGlobalSquadGroups: (
    input: ListGlobalSquadGroupsInput
  ) => Effect<
    readonly GlobalSquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly setSquadGroupVisibility: (
    input: SetSquadGroupVisibilityStoreInput
  ) => Effect<
    SquadGroupVisibilityChange,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly authorizeSquadGroupOwner: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Effect<
    SquadGroupOwnerAccess,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly searchSquadEditorInviteTargets: (
    input: SearchSquadEditorInviteTargetsStoreInput
  ) => Effect<
    readonly SquadEditorInviteTarget[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly findVerifiedSquadEditorInviteTarget: (input: {
    readonly targetUserId: AppUserId;
  }) => Effect<
    SquadEditorInviteTarget,
    | SquadEditorInviteTargetNotFound
    | SquadEditorInviteTargetNotVerified
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly upsertSquadGroupEditorInvite: (
    input: UpsertSquadGroupEditorInviteInput
  ) => Effect<
    SquadGroupInvitationSummary,
    | SquadGroupInvitationTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly respondToSquadGroupInvite: (
    input: RespondToSquadGroupInviteStoreInput
  ) => Effect<
    SquadGroupInvitationSummary,
    | SquadGroupInvitationNotFound
    | ActorIsNotSquadGroupInviteRecipient
    | SquadGroupInvitationTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly revokeSquadGroupEditor: (
    input: RevokeSquadGroupEditorStoreInput
  ) => Effect<
    SquadGroupInvitationSummary,
    | SquadGroupInvitationNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadGroupInvitationTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly listOwnedAccounts: (
    input: ListOwnedMargonemAccountsInput
  ) => Effect<
    readonly OwnedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly findProfileAccessState: (
    input: FindProfileAccessStateInput
  ) => Effect<ProfileAccessState, EffectSquadBuilderPersistenceUnavailable>;
  readonly reserveRequest: (
    input: ReserveFirecrawlRequestInput
  ) => Effect<
    ReservedFirecrawlRequest,
    FirecrawlBudgetError | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly createPendingImport: (
    input: CreatePendingMargonemAccountImportInput
  ) => Effect<
    PendingMargonemAccountImport,
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly findPendingImportForConfirmation: (
    input: FindPendingMargonemAccountImportInput
  ) => Effect<
    PendingMargonemAccountImportForConfirmation,
    | PendingMargonemAccountImportNotFound
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly createOwnedAccountFromPendingImport: (
    input: CreateOwnedAccountFromPendingImportInput
  ) => Effect<
    OwnedMargonemAccountSummary,
    DuplicateMargonemAccountError | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly markRequestSucceeded: (
    input: MarkFirecrawlRequestSucceededInput
  ) => Effect<void, EffectSquadBuilderPersistenceUnavailable>;
  readonly markRequestFailed: (
    input: MarkFirecrawlRequestFailedInput
  ) => Effect<void, EffectSquadBuilderPersistenceUnavailable>;
  readonly getAccountForRefetch: (input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }) => Effect<
    RefetchableMargonemAccount,
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly createPendingRefetch: (
    input: CreatePendingMargonemAccountRefetchInput
  ) => Effect<
    PendingMargonemAccountRefetch,
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly findPendingRefetchForApply: (input: {
    readonly actorUserId: AppUserId;
    readonly refetchPreviewId: PendingMargonemAccountRefetch["id"];
    readonly now: Date;
  }) => Effect<
    PendingMargonemAccountRefetchForApply,
    | PendingMargonemAccountRefetchNotFound
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly applyRefetchedAccount: (
    input: ApplyRefetchedAccountInput
  ) => Effect<
    ApplyAccountRefetchOutput,
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly markPendingRefetchApplied: (
    input: MarkPendingMargonemAccountRefetchAppliedInput
  ) => Effect<void, EffectSquadBuilderPersistenceUnavailable>;
  readonly findOwnedAccountForSharing: (
    input: FindOwnedAccountForSharingInput
  ) => Effect<
    OwnedAccountForSharing,
    MargonemAccountNotFound | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly searchInviteTargets: (
    input: SearchInviteTargetsStoreInput
  ) => Effect<
    readonly AccountInviteTarget[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly findVerifiedInviteTarget: (
    input: FindVerifiedInviteTargetInput
  ) => Effect<
    VerifiedInviteTarget,
    | InviteTargetNotFound
    | InviteTargetNotVerified
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly upsertAccountAccessInvite: (
    input: UpsertAccountAccessInviteInput
  ) => Effect<
    AccountAccessInviteSummary,
    AccountAccessTransitionNotAllowed | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly respondToAccountAccessInvite: (
    input: RespondToAccountAccessInviteStoreInput
  ) => Effect<
    AccountAccessInviteSummary,
    | AccountAccessInviteNotFound
    | ActorIsNotInviteRecipient
    | AccountAccessTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly revokeAccountAccess: (
    input: RevokeAccountAccessStoreInput
  ) => Effect<
    RevokeAccountAccessResult,
    | AccountAccessInviteNotFound
    | ActorDoesNotOwnMargonemAccount
    | AccountAccessTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly listIncomingAccountInvites: (
    input: ListIncomingAccountInvitesInput
  ) => Effect<
    readonly AccountAccessInviteSummary[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly listSharedAccounts: (
    input: ListSharedAccountsInput
  ) => Effect<
    readonly SharedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly listAccountAccessGrants: (
    input: ListAccountAccessGrantsInput
  ) => Effect<
    readonly AccountAccessGrantSummary[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly listIncomingSquadGroupInvites: (input: {
    readonly actorUserId: AppUserId;
  }) => Effect<
    readonly SquadGroupInvitationSummary[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly getPendingSquadGroupInviteCount: (input: {
    readonly actorUserId: AppUserId;
  }) => Effect<number, EffectSquadBuilderPersistenceUnavailable>;
  readonly listSharedSquadGroups: (input: {
    readonly actorUserId: AppUserId;
    readonly filters: ListGlobalSquadGroupsInput["filters"];
  }) => Effect<
    readonly SharedSquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable
  >;
  readonly listSquadGroupEditorGrants: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Effect<
    readonly SquadGroupEditorGrantSummary[],
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable
  >;
}

export type SquadGroupStoreServiceShape = Pick<
  SquadBuilderStoreServiceShape,
  | "authorizeSquadGroupOwner"
  | "createSquadGroup"
  | "findVerifiedSquadEditorInviteTarget"
  | "getPendingSquadGroupInviteCount"
  | "getSquadGroupDetail"
  | "listAvailableCharactersForOwner"
  | "listGlobalSquadGroups"
  | "listIncomingSquadGroupInvites"
  | "listMySquadGroups"
  | "listSharedSquadGroups"
  | "listSquadGroupEditorGrants"
  | "respondToSquadGroupInvite"
  | "revokeSquadGroupEditor"
  | "saveSharedSquadGroupCharacters"
  | "saveSquadGroupSnapshot"
  | "searchSquadEditorInviteTargets"
  | "setSquadGroupVisibility"
  | "upsertSquadGroupEditorInvite"
>;

export type AccountImportStoreServiceShape = Pick<
  SquadBuilderStoreServiceShape,
  | "createOwnedAccountFromPendingImport"
  | "createPendingImport"
  | "findPendingImportForConfirmation"
  | "findProfileAccessState"
  | "listOwnedAccounts"
  | "markRequestFailed"
  | "markRequestSucceeded"
  | "reserveRequest"
>;

export type AccountRefetchStoreServiceShape = Pick<
  SquadBuilderStoreServiceShape,
  | "applyRefetchedAccount"
  | "createPendingRefetch"
  | "findPendingRefetchForApply"
  | "getAccountForRefetch"
  | "markPendingRefetchApplied"
  | "markRequestFailed"
  | "markRequestSucceeded"
  | "reserveRequest"
>;

export type AccountSharingStoreServiceShape = Pick<
  SquadBuilderStoreServiceShape,
  | "findOwnedAccountForSharing"
  | "findVerifiedInviteTarget"
  | "listAccountAccessGrants"
  | "listIncomingAccountInvites"
  | "listOwnedAccounts"
  | "listSharedAccounts"
  | "respondToAccountAccessInvite"
  | "revokeAccountAccess"
  | "searchInviteTargets"
  | "upsertAccountAccessInvite"
>;

export class SquadGroupStoreService extends Context.Service<
  SquadGroupStoreService,
  SquadGroupStoreServiceShape
>()("@tepirek-revamped/api/squad-builder/SquadGroupStoreService") {}

export type {
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  AccountInviteTarget,
  ApplyRefetchedAccountInput,
  AvailableSquadCharacter,
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  CreatePendingMargonemAccountRefetchInput,
  DuplicateMargonemAccountError,
  FindOwnedAccountForSharingInput,
  FindPendingMargonemAccountImportInput,
  FindProfileAccessStateInput,
  FindVerifiedInviteTargetInput,
  FirecrawlBudgetError,
  ListAccountAccessGrantsInput,
  ListIncomingAccountInvitesInput,
  ListOwnedMargonemAccountsInput,
  ListSharedAccountsInput,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  MarkPendingMargonemAccountRefetchAppliedInput,
  OwnedAccountForSharing,
  OwnedMargonemAccountSummary,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportForConfirmation,
  PendingMargonemAccountRefetch,
  PendingMargonemAccountRefetchForApply,
  ProfileAccessState,
  RefetchableMargonemAccount,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
  RespondToAccountAccessInviteStoreInput,
  RevokeAccountAccessResult,
  RevokeAccountAccessStoreInput,
  SearchInviteTargetsStoreInput,
  SharedMargonemAccountSummary,
  UpsertAccountAccessInviteInput,
  VerifiedInviteTarget,
};

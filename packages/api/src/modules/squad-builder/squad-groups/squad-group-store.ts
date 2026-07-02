import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { ApplyAccountRefetchOutput } from "../account-refetch/apply-account-refetch.js";
import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import type {
  AccountAccessInviteSummary,
  AccountAccessGrantSummary,
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnMargonemAccount,
  ActorDoesNotOwnSquadGroup,
  AccountInviteTarget,
  ApplyRefetchedAccountInput,
  AuthorizeSquadGroupViewerInput,
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  CreatePendingMargonemAccountRefetchInput,
  CreateSquadGroupStoreInput,
  DuplicateMargonemAccountError,
  FindOwnedAccountForSharingInput,
  FindPendingMargonemAccountImportInput,
  FindVerifiedInviteTargetInput,
  FindProfileAccessStateInput,
  FirecrawlBudgetError,
  GetSquadGroupDetailInput,
  GlobalSquadGroupSummary,
  GlobalSquadVisibilityStore,
  ListAvailableCharactersForOwnerInput,
  ListIncomingAccountInvitesInput,
  ListAccountAccessGrantsInput,
  ListGlobalSquadGroupsInput,
  ListMySquadGroupsInput,
  ListOwnedMargonemAccountsInput,
  ListSharedAccountsInput,
  MargonemAccountNotFound,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  MarkPendingMargonemAccountRefetchAppliedInput,
  OwnedMargonemAccountSummary,
  OwnedAccountForSharing,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportForConfirmation,
  PendingMargonemAccountImportNotFound,
  PendingMargonemAccountRefetch,
  PendingMargonemAccountRefetchForApply,
  PendingMargonemAccountRefetchNotFound,
  ProfileAccessState,
  RefetchableMargonemAccount,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
  SaveSharedSquadGroupCharactersStoreInput,
  SaveSquadGroupSnapshotStoreInput,
  SearchInviteTargetsStoreInput,
  SearchSquadEditorInviteTargetsStoreInput,
  SetSquadGroupVisibilityStoreInput,
  SharedMargonemAccountSummary,
  SharedSquadGroupSummary,
  SquadBuilderPersistenceUnavailable,
  SquadDetail,
  SquadEditorInviteTarget,
  SquadGroupCharacter,
  SquadGroupDetail,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
  SquadGroupNotFound,
  SquadGroupSharingAuthorizationError,
  SquadGroupSharingStore,
  SquadGroupStore,
  SquadGroupSummary,
  SquadGroupVisibilityChange,
  UpsertAccountAccessInviteInput,
  UpsertSquadGroupEditorInviteInput,
  VerifiedInviteTarget,
  RespondToAccountAccessInviteStoreInput,
  RespondToSquadGroupInviteStoreInput,
  RevokeAccountAccessResult,
  RevokeAccountAccessStoreInput,
  RevokeSquadGroupEditorStoreInput,
} from "../squad-builder-store.js";
import type { SquadGroupOwnerAccess } from "../squad-group-access.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type { AvailableSquadCharacter } from "../squad-group-snapshot.js";
import type { SquadId } from "../squad-id.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";

export interface EffectSquadBuilderStoreShape {
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
    | { readonly _tag: "SquadNotInGroup"; readonly squadId: SquadId }
    | { readonly _tag: "EditorCannotChangeSquadStructure" }
    | {
        readonly _tag: "SquadCharacterNotAccessible";
        readonly characterId: number;
      }
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
    | { readonly _tag: "SquadEditorInviteTargetNotFound" }
    | { readonly _tag: "SquadEditorInviteTargetNotVerified" }
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly upsertSquadGroupEditorInvite: (
    input: UpsertSquadGroupEditorInviteInput
  ) => Effect<
    SquadGroupInvitationSummary,
    | {
        readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
        readonly currentStatus: "pending" | "accepted" | "declined" | "revoked";
        readonly attempted: string;
      }
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly respondToSquadGroupInvite: (
    input: RespondToSquadGroupInviteStoreInput
  ) => Effect<
    SquadGroupInvitationSummary,
    | { readonly _tag: "SquadGroupInvitationNotFound" }
    | { readonly _tag: "ActorIsNotSquadGroupInviteRecipient" }
    | {
        readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
        readonly currentStatus: "pending" | "accepted" | "declined" | "revoked";
        readonly attempted: string;
      }
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly revokeSquadGroupEditor: (
    input: RevokeSquadGroupEditorStoreInput
  ) => Effect<
    SquadGroupInvitationSummary,
    | { readonly _tag: "SquadGroupInvitationNotFound" }
    | ActorDoesNotOwnSquadGroup
    | {
        readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
        readonly currentStatus: "pending" | "accepted" | "declined" | "revoked";
        readonly attempted: string;
      }
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
    | { readonly _tag: "InviteTargetNotFound" }
    | { readonly _tag: "InviteTargetNotVerified" }
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly upsertAccountAccessInvite: (
    input: UpsertAccountAccessInviteInput
  ) => Effect<
    AccountAccessInviteSummary,
    | {
        readonly _tag: "AccountAccessTransitionNotAllowed";
        readonly currentStatus: "pending" | "accepted" | "declined" | "revoked";
        readonly attempted: string;
      }
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly respondToAccountAccessInvite: (
    input: RespondToAccountAccessInviteStoreInput
  ) => Effect<
    AccountAccessInviteSummary,
    | { readonly _tag: "AccountAccessInviteNotFound" }
    | { readonly _tag: "ActorIsNotInviteRecipient" }
    | {
        readonly _tag: "AccountAccessTransitionNotAllowed";
        readonly currentStatus: "pending" | "accepted" | "declined" | "revoked";
        readonly attempted: string;
      }
    | EffectSquadBuilderPersistenceUnavailable
  >;
  readonly revokeAccountAccess: (
    input: RevokeAccountAccessStoreInput
  ) => Effect<
    RevokeAccountAccessResult,
    | { readonly _tag: "AccountAccessInviteNotFound" }
    | { readonly _tag: "ActorDoesNotOwnMargonemAccount" }
    | {
        readonly _tag: "AccountAccessTransitionNotAllowed";
        readonly currentStatus: "pending" | "accepted" | "declined" | "revoked";
        readonly attempted: string;
      }
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

export type EffectSquadGroupStoreShape = Pick<
  EffectSquadBuilderStoreShape,
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

export type EffectAccountImportStoreShape = Pick<
  EffectSquadBuilderStoreShape,
  | "createOwnedAccountFromPendingImport"
  | "createPendingImport"
  | "findPendingImportForConfirmation"
  | "findProfileAccessState"
  | "listOwnedAccounts"
  | "markRequestFailed"
  | "markRequestSucceeded"
  | "reserveRequest"
>;

export type EffectAccountRefetchStoreShape = Pick<
  EffectSquadBuilderStoreShape,
  | "applyRefetchedAccount"
  | "createPendingRefetch"
  | "findPendingRefetchForApply"
  | "getAccountForRefetch"
  | "markPendingRefetchApplied"
  | "markRequestFailed"
  | "markRequestSucceeded"
  | "reserveRequest"
>;

export type EffectAccountSharingStoreShape = Pick<
  EffectSquadBuilderStoreShape,
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

export class EffectSquadGroupStore extends Context.Service<
  EffectSquadGroupStore,
  EffectSquadGroupStoreShape
>()("@tepirek-revamped/api/squad-builder/EffectSquadGroupStore") {}

/** Squad group persistence contracts used by group editing, sharing, and visibility services. */
export type SquadGroupsPersistenceStore = SquadGroupStore &
  SquadGroupSharingStore &
  GlobalSquadVisibilityStore;

export type {
  AccountAccessInviteSummary,
  AccountAccessGrantSummary,
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnMargonemAccount,
  ActorDoesNotOwnSquadGroup,
  AccountInviteTarget,
  ApplyRefetchedAccountInput,
  AuthorizeSquadGroupViewerInput,
  AvailableSquadCharacter,
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  CreatePendingMargonemAccountRefetchInput,
  CreateSquadGroupStoreInput,
  DuplicateMargonemAccountError,
  FindOwnedAccountForSharingInput,
  FindPendingMargonemAccountImportInput,
  FindVerifiedInviteTargetInput,
  FindProfileAccessStateInput,
  FirecrawlBudgetError,
  GetSquadGroupDetailInput,
  GlobalSquadGroupSummary,
  GlobalSquadVisibilityStore,
  ListAvailableCharactersForOwnerInput,
  ListIncomingAccountInvitesInput,
  ListAccountAccessGrantsInput,
  ListGlobalSquadGroupsInput,
  ListMySquadGroupsInput,
  ListOwnedMargonemAccountsInput,
  ListSharedAccountsInput,
  MargonemAccountNotFound,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  MarkPendingMargonemAccountRefetchAppliedInput,
  OwnedMargonemAccountSummary,
  OwnedAccountForSharing,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportForConfirmation,
  PendingMargonemAccountImportNotFound,
  PendingMargonemAccountRefetch,
  PendingMargonemAccountRefetchForApply,
  PendingMargonemAccountRefetchNotFound,
  ProfileAccessState,
  RefetchableMargonemAccount,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
  RespondToAccountAccessInviteStoreInput,
  RespondToSquadGroupInviteStoreInput,
  RevokeAccountAccessResult,
  RevokeAccountAccessStoreInput,
  RevokeSquadGroupEditorStoreInput,
  SaveSharedSquadGroupCharactersStoreInput,
  SaveSquadGroupSnapshotStoreInput,
  SearchInviteTargetsStoreInput,
  SearchSquadEditorInviteTargetsStoreInput,
  SetSquadGroupVisibilityStoreInput,
  SharedMargonemAccountSummary,
  SharedSquadGroupSummary,
  SquadBuilderPersistenceUnavailable,
  SquadDetail,
  SquadEditorInviteTarget,
  SquadGroupCharacter,
  SquadGroupDetail,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
  SquadGroupNotFound,
  SquadGroupSharingAuthorizationError,
  SquadGroupSharingStore,
  SquadGroupStore,
  SquadGroupSummary,
  SquadGroupVisibilityChange,
  UpsertAccountAccessInviteInput,
  UpsertSquadGroupEditorInviteInput,
  VerifiedInviteTarget,
};

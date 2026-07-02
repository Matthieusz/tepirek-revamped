import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { ApplyAccountRefetchOutput } from "../account-refetch/apply-account-refetch";
import type { AppUserId } from "../app-user-id";
import type { MargonemAccountId } from "../margonem-account-id";
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
} from "../squad-builder-store";
import type { AvailableSquadCharacter } from "../squad-group-snapshot";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors";

export interface EffectSquadGroupStoreShape {
  readonly createSquadGroup: (
    input: CreateSquadGroupStoreInput
  ) => Effect<
    SquadGroupSummary,
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly listMySquadGroups: (
    input: ListMySquadGroupsInput
  ) => Effect<
    readonly SquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly getSquadGroupDetail: (
    input: GetSquadGroupDetailInput
  ) => Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorCannotViewSquadGroup
    | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly listAvailableCharactersForOwner: (
    input: ListAvailableCharactersForOwnerInput
  ) => Effect<
    readonly AvailableSquadCharacter[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly saveSquadGroupSnapshot: (
    input: SaveSquadGroupSnapshotStoreInput
  ) => Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly listGlobalSquadGroups: (
    input: ListGlobalSquadGroupsInput
  ) => Effect<
    readonly GlobalSquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly setSquadGroupVisibility: (
    input: SetSquadGroupVisibilityStoreInput
  ) => Effect<
    SquadGroupVisibilityChange,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly listOwnedAccounts: (
    input: ListOwnedMargonemAccountsInput
  ) => Effect<
    readonly OwnedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly findProfileAccessState: (
    input: FindProfileAccessStateInput
  ) => Effect<
    ProfileAccessState,
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly reserveRequest: (
    input: ReserveFirecrawlRequestInput
  ) => Effect<
    ReservedFirecrawlRequest,
    FirecrawlBudgetError | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly createPendingImport: (
    input: CreatePendingMargonemAccountImportInput
  ) => Effect<
    PendingMargonemAccountImport,
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly findPendingImportForConfirmation: (
    input: FindPendingMargonemAccountImportInput
  ) => Effect<
    PendingMargonemAccountImportForConfirmation,
    | PendingMargonemAccountImportNotFound
    | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly createOwnedAccountFromPendingImport: (
    input: CreateOwnedAccountFromPendingImportInput
  ) => Effect<
    OwnedMargonemAccountSummary,
    DuplicateMargonemAccountError | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly markRequestSucceeded: (
    input: MarkFirecrawlRequestSucceededInput
  ) => Effect<void, EffectSquadBuilderPersistenceUnavailable, never>;
  readonly markRequestFailed: (
    input: MarkFirecrawlRequestFailedInput
  ) => Effect<void, EffectSquadBuilderPersistenceUnavailable, never>;
  readonly getAccountForRefetch: (input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }) => Effect<
    RefetchableMargonemAccount,
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly createPendingRefetch: (
    input: CreatePendingMargonemAccountRefetchInput
  ) => Effect<
    PendingMargonemAccountRefetch,
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly findPendingRefetchForApply: (input: {
    readonly actorUserId: AppUserId;
    readonly refetchPreviewId: PendingMargonemAccountRefetch["id"];
    readonly now: Date;
  }) => Effect<
    PendingMargonemAccountRefetchForApply,
    | PendingMargonemAccountRefetchNotFound
    | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly applyRefetchedAccount: (
    input: ApplyRefetchedAccountInput
  ) => Effect<
    ApplyAccountRefetchOutput,
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly markPendingRefetchApplied: (
    input: MarkPendingMargonemAccountRefetchAppliedInput
  ) => Effect<void, EffectSquadBuilderPersistenceUnavailable, never>;
  readonly findOwnedAccountForSharing: (
    input: FindOwnedAccountForSharingInput
  ) => Effect<
    OwnedAccountForSharing,
    MargonemAccountNotFound | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly searchInviteTargets: (
    input: SearchInviteTargetsStoreInput
  ) => Effect<
    readonly AccountInviteTarget[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly findVerifiedInviteTarget: (
    input: FindVerifiedInviteTargetInput
  ) => Effect<
    VerifiedInviteTarget,
    | { readonly _tag: "InviteTargetNotFound" }
    | { readonly _tag: "InviteTargetNotVerified" }
    | EffectSquadBuilderPersistenceUnavailable,
    never
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
    | EffectSquadBuilderPersistenceUnavailable,
    never
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
    | EffectSquadBuilderPersistenceUnavailable,
    never
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
    | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly listIncomingAccountInvites: (
    input: ListIncomingAccountInvitesInput
  ) => Effect<
    readonly AccountAccessInviteSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly listSharedAccounts: (
    input: ListSharedAccountsInput
  ) => Effect<
    readonly SharedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly listAccountAccessGrants: (
    input: ListAccountAccessGrantsInput
  ) => Effect<
    readonly AccountAccessGrantSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
}

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

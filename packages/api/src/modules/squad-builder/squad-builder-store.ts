import { db as defaultDb } from "@tepirek-revamped/db";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  firecrawlProfileScrapeRequest,
  margonemAccount,
  margonemAccountAccess,
  margonemAccountImportPreview,
  margonemAccountImportPreviewCharacter,
  margonemAccountRefetchPreview,
  margonemAccountRefetchPreviewCharacter,
  margonemCharacter,
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  ne,
  not,
  or,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import {
  canTransitionAccountAccess,
  parseAccountAccessStatus,
} from "./account-access-status";
import type { AccountAccessStatus } from "./account-access-status";
import {
  accountDisplayNameToString,
  parseAccountDisplayName,
} from "./account-display-name";
import type { AccountDisplayName } from "./account-display-name";
import { appUserIdToString, parseAppUserId } from "./app-user-id";
import type { AppUserId } from "./app-user-id";
import type { ApplyAccountRefetchOutput } from "./apply-account-refetch";
import type { FirecrawlCreditCount } from "./firecrawl-config";
import { firecrawlYearMonthToString } from "./firecrawl-year-month";
import type { FirecrawlYearMonth } from "./firecrawl-year-month";
import {
  margonemAccountAccessIdToNumber,
  parseMargonemAccountAccessId,
} from "./margonem-account-access-id";
import type { MargonemAccountAccessId } from "./margonem-account-access-id";
import { margonemAccountIdToNumber } from "./margonem-account-id";
import type { MargonemAccountId } from "./margonem-account-id";
import type {
  MargonemAccountRefetchDiff,
  StoredMargonemCharacterSnapshot,
} from "./margonem-account-refetch-diff";
import type {
  MargonemCharacterPreview,
  MargonemProfession,
} from "./margonem-character";
import {
  parseMargonemProfession,
  parseMargonemWorld,
} from "./margonem-character";
import {
  characterIdToNumber,
  levelToNumber,
  parseMargonemCharacterId,
  parseMargonemProfileId,
  parsePositiveLevel,
  profileIdToNumber,
} from "./margonem-profile-id";
import type { MargonemProfileId } from "./margonem-profile-id";
import { toMargonemProfileUrl } from "./margonem-profile-url";
import { pendingImportIdToNumber } from "./pending-margonem-account-import-id";
import type { PendingMargonemAccountImportId } from "./pending-margonem-account-import-id";
import { pendingRefetchIdToNumber } from "./pending-margonem-account-refetch-id";
import type { PendingMargonemAccountRefetchId } from "./pending-margonem-account-refetch-id";
import { err, isError, ok } from "./result";
import type { Result } from "./result";
import type {
  SharedSquadGroupCharactersSnapshot,
  SharedSquadGroupSaveError,
} from "./save-shared-squad-group-characters";
import type {
  SquadGroupAccess,
  SquadGroupAccessRole,
  SquadGroupOwnerAccess,
} from "./squad-group-access";
import type { SquadGroupId } from "./squad-group-id";
import { squadGroupIdToNumber } from "./squad-group-id";
import type { SquadGroupInvitationId } from "./squad-group-invitation-id";
import { squadGroupInvitationIdToNumber } from "./squad-group-invitation-id";
import {
  canTransitionSquadGroupInvitation,
  parseSquadGroupInvitationStatus,
} from "./squad-group-invitation-status";
import type { SquadGroupInvitationStatus } from "./squad-group-invitation-status";
import {
  squadGroupLevelBoundToNumber,
  squadGroupNameQueryToString,
} from "./squad-group-list-filters";
import type { SquadGroupListFilters } from "./squad-group-list-filters";
import type {
  AvailableSquadCharacter,
  SquadGroupDraftSnapshot,
} from "./squad-group-snapshot";
import { parseSquadGroupVisibility } from "./squad-group-visibility";
import type { SquadGroupVisibility } from "./squad-group-visibility";
import type { SquadId } from "./squad-id";
import { squadGroupNameToString, squadNameToString } from "./squad-name";
import type { SquadGroupName } from "./squad-name";

/** Access state for a Margonem profile relative to the current user. */
export type ProfileAccessState =
  | { readonly _tag: "Available" }
  | { readonly _tag: "OwnedByActor" }
  | { readonly _tag: "OwnedByAnotherUser" }
  | { readonly _tag: "SharedWithActor" };

/** Expected persistence failure for squad-builder storage operations. */
export interface SquadBuilderPersistenceUnavailable {
  readonly _tag: "SquadBuilderPersistenceUnavailable";
  readonly operation: string;
  readonly cause: unknown;
}

/** Input for checking whether a profile can be imported. */
export interface FindProfileAccessStateInput {
  readonly profileId: MargonemProfileId;
  readonly actorUserId: AppUserId;
}

/** Persistence capability for account duplicate/access checks. */
export interface SquadBuilderAccountLookup {
  readonly findProfileAccessState: (
    input: FindProfileAccessStateInput
  ) => Promise<Result<ProfileAccessState, SquadBuilderPersistenceUnavailable>>;
}

/** Firecrawl request status recorded in the monthly request ledger. */
export type FirecrawlRequestStatus = "reserved" | "succeeded" | "failed";

/** Current state of Firecrawl monthly budget usage. */
export interface FirecrawlBudgetState {
  readonly yearMonth: FirecrawlYearMonth;
  readonly monthlyRequestBudget: number;
  readonly usedRequests: number;
  readonly remainingRequests: number;
}

/** Expected failure while reserving Firecrawl request budget. */
export type FirecrawlBudgetError =
  | {
      readonly _tag: "FirecrawlMonthlyBudgetExhausted";
      readonly yearMonth: FirecrawlYearMonth;
      readonly monthlyRequestBudget: number;
      readonly usedRequests: number;
    }
  | SquadBuilderPersistenceUnavailable;

/** Input for reserving one Firecrawl request. */
export interface ReserveFirecrawlRequestInput {
  readonly profileId: MargonemProfileId;
  readonly requestedByUserId: AppUserId;
  readonly yearMonth: FirecrawlYearMonth;
  readonly monthlyRequestBudget: number;
}

/** Reserved Firecrawl request row and budget summary. */
export interface ReservedFirecrawlRequest {
  readonly requestId: number;
  readonly budgetState: FirecrawlBudgetState;
}

/** Input for marking a reserved Firecrawl request as successful. */
export interface MarkFirecrawlRequestSucceededInput {
  readonly requestId: number;
  readonly creditsUsed: FirecrawlCreditCount;
  readonly firecrawlStatusCode: number | null;
  readonly cacheState: string | null;
}

/** Input for marking a reserved Firecrawl request as failed. */
export interface MarkFirecrawlRequestFailedInput {
  readonly requestId: number;
  readonly errorTag: string;
}

/** Persistence capability for Firecrawl monthly request usage. */
export interface FirecrawlRequestLedger {
  readonly reserveRequest: (
    input: ReserveFirecrawlRequestInput
  ) => Promise<Result<ReservedFirecrawlRequest, FirecrawlBudgetError>>;

  readonly markRequestSucceeded: (
    input: MarkFirecrawlRequestSucceededInput
  ) => Promise<Result<void, SquadBuilderPersistenceUnavailable>>;

  readonly markRequestFailed: (
    input: MarkFirecrawlRequestFailedInput
  ) => Promise<Result<void, SquadBuilderPersistenceUnavailable>>;
}

/** Expected duplicate/access failures for owned account imports. */
export type DuplicateMargonemAccountError =
  | { readonly _tag: "MargonemAccountAlreadyOwnedByActor" }
  | { readonly _tag: "MargonemAccountOwnedByAnotherUser" }
  | { readonly _tag: "MargonemAccountAlreadySharedWithActor" };

/** Expected failure when a pending import cannot be found for confirmation. */
export interface PendingMargonemAccountImportNotFound {
  readonly _tag: "PendingMargonemAccountImportNotFound";
}

/** Input for storing a successful preview as a pending import. */
export interface CreatePendingMargonemAccountImportInput {
  readonly actorUserId: AppUserId;
  readonly profileId: MargonemProfileId;
  readonly suggestedAccountName: string;
  readonly defaultDisplayName: AccountDisplayName;
  readonly generatedProfileUrl: string;
  readonly fetchedAt: Date;
  readonly expiresAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Stored pending import identity. */
export interface PendingMargonemAccountImport {
  readonly id: PendingMargonemAccountImportId;
  readonly profileId: MargonemProfileId;
}

/** Input for loading a pending import for confirmation. */
export interface FindPendingMargonemAccountImportInput {
  readonly actorUserId: AppUserId;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly now: Date;
}

/** Server-trusted pending import data ready for confirmation. */
export interface PendingMargonemAccountImportForConfirmation {
  readonly id: PendingMargonemAccountImportId;
  readonly actorUserId: AppUserId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
}

/** Input for marking a pending import as confirmed. */
export interface MarkPendingMargonemAccountImportConfirmedInput {
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly confirmedAt: Date;
}

/** Persistence capability for pending Margonem account imports. */
export interface PendingMargonemAccountImportStore {
  readonly createPendingImport: (
    input: CreatePendingMargonemAccountImportInput
  ) => Promise<
    Result<PendingMargonemAccountImport, SquadBuilderPersistenceUnavailable>
  >;

  readonly findPendingImportForConfirmation: (
    input: FindPendingMargonemAccountImportInput
  ) => Promise<
    Result<
      PendingMargonemAccountImportForConfirmation,
      PendingMargonemAccountImportNotFound | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly markPendingImportConfirmed: (
    input: MarkPendingMargonemAccountImportConfirmedInput
  ) => Promise<Result<void, SquadBuilderPersistenceUnavailable>>;
}

/** Read model for one owned Margonem account. */
export interface OwnedMargonemAccountSummary {
  readonly accountId: number;
  readonly profileId: MargonemProfileId;
  readonly displayName: AccountDisplayName;
  readonly generatedProfileUrl: string;
  readonly lastFetchedAt: Date;
  readonly characterCount: number;
}

/** Input for confirming a pending import into an owned account. */
export interface CreateOwnedAccountFromPendingImportInput {
  readonly actorUserId: AppUserId;
  readonly pending: PendingMargonemAccountImportForConfirmation;
  readonly displayName: AccountDisplayName;
}

/** Persistence capability for writing owned Margonem accounts. */
export interface OwnedMargonemAccountWriter {
  readonly createOwnedAccountFromPendingImport: (
    input: CreateOwnedAccountFromPendingImportInput
  ) => Promise<
    Result<
      OwnedMargonemAccountSummary,
      DuplicateMargonemAccountError | SquadBuilderPersistenceUnavailable
    >
  >;
}

/** Input for listing owned Margonem accounts. */
export interface ListOwnedMargonemAccountsInput {
  readonly actorUserId: AppUserId;
}

/** Persistence capability for reading owned Margonem accounts. */
export interface OwnedMargonemAccountReader {
  readonly listOwnedAccounts: (
    input: ListOwnedMargonemAccountsInput
  ) => Promise<
    Result<
      readonly OwnedMargonemAccountSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;
}

/** Expected failure when a squad group does not exist. */
export interface SquadGroupNotFound {
  readonly _tag: "SquadGroupNotFound";
}

/** Expected failure when an actor is not the squad group owner. */
export interface ActorDoesNotOwnSquadGroup {
  readonly _tag: "ActorDoesNotOwnSquadGroup";
}

/** Expected failure when an actor cannot view a squad group they don't own or share. */
export interface ActorCannotViewSquadGroup {
  readonly _tag: "ActorCannotViewSquadGroup";
}

/** Expected failure when an actor is not the owner or an invited editor. */
export interface ActorCannotEditSquadGroup {
  readonly _tag: "ActorCannotEditSquadGroup";
}

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

/** Persistence capability for squad group editing. */
export interface SquadGroupStore {
  readonly createSquadGroup: (
    input: CreateSquadGroupStoreInput
  ) => Promise<Result<SquadGroupSummary, SquadBuilderPersistenceUnavailable>>;
  readonly listMySquadGroups: (
    input: ListMySquadGroupsInput
  ) => Promise<
    Result<readonly SquadGroupSummary[], SquadBuilderPersistenceUnavailable>
  >;
  readonly getSquadGroupDetail: (
    input: GetSquadGroupDetailInput
  ) => Promise<
    Result<
      SquadGroupDetail,
      | SquadGroupNotFound
      | ActorCannotViewSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
  readonly listAvailableCharactersForOwner: (
    input: ListAvailableCharactersForOwnerInput
  ) => Promise<
    Result<
      readonly AvailableSquadCharacter[],
      SquadBuilderPersistenceUnavailable
    >
  >;
  readonly saveSquadGroupSnapshot: (
    input: SaveSquadGroupSnapshotStoreInput
  ) => Promise<
    Result<
      SquadGroupDetail,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
}

/** Persistence capability for squad group sharing/editing by invited users. */
export interface GlobalSquadVisibilityStore {
  readonly setSquadGroupVisibility: (
    input: SetSquadGroupVisibilityStoreInput
  ) => Promise<
    Result<
      SquadGroupVisibilityChange,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
  readonly listGlobalSquadGroups: (
    input: ListGlobalSquadGroupsInput
  ) => Promise<
    Result<
      readonly GlobalSquadGroupSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;
  readonly authorizeSquadGroupViewer: (
    input: AuthorizeSquadGroupViewerInput
  ) => Promise<
    Result<
      SquadGroupAccess,
      | SquadGroupNotFound
      | ActorCannotViewSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
}

export interface SquadGroupSharingStore {
  readonly authorizeSquadGroupOwner: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Promise<
    Result<
      SquadGroupOwnerAccess,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
  readonly authorizeSquadGroupViewer: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Promise<
    Result<
      SquadGroupAccess,
      | SquadGroupNotFound
      | ActorCannotViewSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
  readonly authorizeSquadGroupEditor: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Promise<
    Result<
      SquadGroupAccess,
      | SquadGroupNotFound
      | ActorCannotEditSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
  readonly searchSquadEditorInviteTargets: (
    input: SearchSquadEditorInviteTargetsStoreInput
  ) => Promise<
    Result<
      readonly SquadEditorInviteTarget[],
      SquadBuilderPersistenceUnavailable
    >
  >;
  readonly findVerifiedSquadEditorInviteTarget: (input: {
    readonly targetUserId: AppUserId;
  }) => Promise<
    Result<
      SquadEditorInviteTarget,
      | { readonly _tag: "SquadEditorInviteTargetNotFound" }
      | { readonly _tag: "SquadEditorInviteTargetNotVerified" }
      | SquadBuilderPersistenceUnavailable
    >
  >;
  readonly upsertSquadGroupEditorInvite: (
    input: UpsertSquadGroupEditorInviteInput
  ) => Promise<
    Result<
      SquadGroupInvitationSummary,
      | {
          readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
          readonly currentStatus: SquadGroupInvitationStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  >;
  readonly listIncomingSquadGroupInvites: (input: {
    readonly actorUserId: AppUserId;
  }) => Promise<
    Result<
      readonly SquadGroupInvitationSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;
  readonly getPendingSquadGroupInviteCount: (input: {
    readonly actorUserId: AppUserId;
  }) => Promise<Result<number, SquadBuilderPersistenceUnavailable>>;
  readonly respondToSquadGroupInvite: (
    input: RespondToSquadGroupInviteStoreInput
  ) => Promise<
    Result<
      SquadGroupInvitationSummary,
      | { readonly _tag: "SquadGroupInvitationNotFound" }
      | { readonly _tag: "ActorIsNotSquadGroupInviteRecipient" }
      | {
          readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
          readonly currentStatus: SquadGroupInvitationStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  >;
  readonly revokeSquadGroupEditor: (
    input: RevokeSquadGroupEditorStoreInput
  ) => Promise<
    Result<
      SquadGroupInvitationSummary,
      | { readonly _tag: "SquadGroupInvitationNotFound" }
      | ActorDoesNotOwnSquadGroup
      | {
          readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
          readonly currentStatus: SquadGroupInvitationStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  >;
  readonly listSharedSquadGroups: (input: {
    readonly actorUserId: AppUserId;
    readonly filters: SquadGroupListFilters;
  }) => Promise<
    Result<
      readonly SharedSquadGroupSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;
  readonly listSquadGroupEditorGrants: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Promise<
    Result<
      readonly SquadGroupEditorGrantSummary[],
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
  readonly saveSharedSquadGroupCharacters: (
    input: SaveSharedSquadGroupCharactersStoreInput
  ) => Promise<Result<SquadGroupDetail, SharedSquadGroupSaveError>>;
}

// ---------------------------------------------------------------------------
// Account sharing (Slice 3)
// ---------------------------------------------------------------------------

/** Expected authorization failures for account sharing operations. */
export type AccountSharingAuthorizationError =
  | { readonly _tag: "MargonemAccountNotFound" }
  | { readonly _tag: "ActorDoesNotOwnMargonemAccount" }
  | { readonly _tag: "CannotInviteSelf" }
  | { readonly _tag: "InviteTargetNotFound" }
  | { readonly _tag: "InviteTargetNotVerified" }
  | { readonly _tag: "AccountAccessInviteNotFound" }
  | { readonly _tag: "ActorIsNotInviteRecipient" }
  | {
      readonly _tag: "AccountAccessTransitionNotAllowed";
      readonly currentStatus: AccountAccessStatus;
      readonly attempted: string;
    };

/** A verified user that may be invited to use an account. */
export interface AccountInviteTarget {
  readonly userId: AppUserId;
  readonly name: string;
  readonly image: string | null;
}

/** Input for searching verified invite targets for an account. */
export interface SearchInviteTargetsStoreInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly query: string;
}

/** Input for loading an owned account for sharing authorization. */
export interface FindOwnedAccountForSharingInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}

/** An owned account loaded for sharing authorization. */
export interface OwnedAccountForSharing {
  readonly accountId: MargonemAccountId;
  readonly ownerUserId: AppUserId;
  readonly displayName: AccountDisplayName;
  readonly profileId: MargonemProfileId;
}

/** Input for resolving a verified invite target by user id. */
export interface FindVerifiedInviteTargetInput {
  readonly targetUserId: AppUserId;
}

/** A verified user resolved as a valid invite target. */
export interface VerifiedInviteTarget {
  readonly userId: AppUserId;
  readonly name: string;
  readonly image: string | null;
}

/** Input for upserting an account access invite as the account owner. */
export interface UpsertAccountAccessInviteInput {
  readonly accountId: MargonemAccountId;
  readonly ownerUserId: AppUserId;
  readonly invitedUserId: AppUserId;
  readonly now: Date;
}

/** Read model for one account access invite shown to the recipient. */
export interface AccountAccessInviteSummary {
  readonly accessId: MargonemAccountAccessId;
  readonly accountId: MargonemAccountId;
  readonly accountDisplayName: AccountDisplayName;
  readonly generatedProfileUrl: string;
  readonly ownerUserId: AppUserId;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly invitedUserId: AppUserId;
  readonly status: AccountAccessStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Input for listing incoming invites for the actor. */
export interface ListIncomingAccountInvitesInput {
  readonly actorUserId: AppUserId;
}

/** Input for responding to an account access invite as the recipient. */
export interface RespondToAccountAccessInviteStoreInput {
  readonly accessId: MargonemAccountAccessId;
  readonly invitedUserId: AppUserId;
  readonly response: "accept" | "decline";
  readonly now: Date;
}

/** Input for revoking account access as the account owner. */
export interface RevokeAccountAccessStoreInput {
  readonly accessId: MargonemAccountAccessId;
  readonly ownerUserId: AppUserId;
  readonly now: Date;
}

/** Result of revoking account access, including squad cleanup impact. */
export interface RevokeAccountAccessResult {
  readonly accessId: MargonemAccountAccessId;
  readonly accountId: MargonemAccountId;
  readonly revokedUserId: AppUserId;
  readonly removedSquadCharacterCount: number;
}

/** Input for listing accounts shared with the actor. */
export interface ListSharedAccountsInput {
  readonly actorUserId: AppUserId;
}

/** Read model for one account shared with the actor. */
export interface SharedMargonemAccountSummary {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly displayName: AccountDisplayName;
  readonly generatedProfileUrl: string;
  readonly ownerUserId: AppUserId;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly lastFetchedAt: Date;
  readonly characterCount: number;
}

/** Input for listing access grants for an owned account. */
export interface ListAccountAccessGrantsInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}

/** Read model for one access grant shown to the account owner. */
export interface AccountAccessGrantSummary {
  readonly accessId: MargonemAccountAccessId;
  readonly invitedUserId: AppUserId;
  readonly invitedUserName: string;
  readonly invitedUserImage: string | null;
  readonly status: Extract<AccountAccessStatus, "pending" | "accepted">;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Owner-only authorization capability for a Margonem account. Slice 4 refetch
 * uses this seam rather than re-checking ownership inline. Shared accepted
 * users are intentionally not authorized here.
 */
export interface MargonemAccountNotFound {
  readonly _tag: "MargonemAccountNotFound";
}

/** Expected failure when an actor is not the Margonem account owner. */
export interface ActorDoesNotOwnMargonemAccount {
  readonly _tag: "ActorDoesNotOwnMargonemAccount";
}

export interface MargonemAccountOwnerAuthorizer {
  readonly authorizeOwner: (input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }) => Promise<
    Result<
      OwnedAccountForSharing,
      | MargonemAccountNotFound
      | ActorDoesNotOwnMargonemAccount
      | SquadBuilderPersistenceUnavailable
    >
  >;
}

/** Account and current character state needed for a manual refetch preview. */
export interface RefetchableMargonemAccount {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly displayName: AccountDisplayName;
  readonly currentCharacters: readonly StoredMargonemCharacterSnapshot[];
}

/** Persistence capability for loading an account before manual refetch. */
export interface RefetchableMargonemAccountReader {
  readonly getAccountForRefetch: (input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }) => Promise<
    Result<
      RefetchableMargonemAccount,
      | MargonemAccountNotFound
      | ActorDoesNotOwnMargonemAccount
      | SquadBuilderPersistenceUnavailable
    >
  >;
}

/** Expected failure when a pending refetch cannot be applied. */
export interface PendingMargonemAccountRefetchNotFound {
  readonly _tag: "PendingMargonemAccountRefetchNotFound";
}

/** Input for storing a manual refetch preview. */
export interface CreatePendingMargonemAccountRefetchInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly expiresAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly latestCharacters: readonly MargonemCharacterPreview[];
  readonly diff: MargonemAccountRefetchDiff;
}

/** Stored pending refetch identity. */
export interface PendingMargonemAccountRefetch {
  readonly id: PendingMargonemAccountRefetchId;
}

/** Input for loading a pending refetch to apply. */
export interface FindPendingMargonemAccountRefetchInput {
  readonly actorUserId: AppUserId;
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
  readonly now: Date;
}

/** Server-trusted pending refetch data ready for application. */
export interface PendingMargonemAccountRefetchForApply {
  readonly id: PendingMargonemAccountRefetchId;
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly latestCharacters: readonly MargonemCharacterPreview[];
}

/** Input for marking a pending refetch as applied. */
export interface MarkPendingMargonemAccountRefetchAppliedInput {
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
  readonly appliedAt: Date;
}

/** Persistence capability for pending account refetch previews. */
export interface PendingMargonemAccountRefetchStore {
  readonly createPendingRefetch: (
    input: CreatePendingMargonemAccountRefetchInput
  ) => Promise<
    Result<PendingMargonemAccountRefetch, SquadBuilderPersistenceUnavailable>
  >;

  readonly findPendingRefetchForApply: (
    input: FindPendingMargonemAccountRefetchInput
  ) => Promise<
    Result<
      PendingMargonemAccountRefetchForApply,
      PendingMargonemAccountRefetchNotFound | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly markPendingRefetchApplied: (
    input: MarkPendingMargonemAccountRefetchAppliedInput
  ) => Promise<Result<void, SquadBuilderPersistenceUnavailable>>;
}

/** Input for transactionally applying pending refetch data. */
export interface ApplyRefetchedAccountInput {
  readonly actorUserId: AppUserId;
  readonly pendingRefetch: PendingMargonemAccountRefetchForApply;
  readonly now: Date;
}

/** Persistence capability for applying latest refetched account characters. */
export interface RefetchedMargonemAccountWriter {
  readonly applyRefetchedAccount: (
    input: ApplyRefetchedAccountInput
  ) => Promise<
    Result<ApplyAccountRefetchOutput, SquadBuilderPersistenceUnavailable>
  >;
}

/** Persistence capability for account sharing. */
export interface AccountSharingStore {
  readonly searchInviteTargets: (
    input: SearchInviteTargetsStoreInput
  ) => Promise<
    Result<readonly AccountInviteTarget[], SquadBuilderPersistenceUnavailable>
  >;

  readonly findOwnedAccountForSharing: (
    input: FindOwnedAccountForSharingInput
  ) => Promise<
    Result<
      OwnedAccountForSharing,
      | { readonly _tag: "MargonemAccountNotFound" }
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly findVerifiedInviteTarget: (
    input: FindVerifiedInviteTargetInput
  ) => Promise<
    Result<
      VerifiedInviteTarget,
      | { readonly _tag: "InviteTargetNotFound" }
      | { readonly _tag: "InviteTargetNotVerified" }
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly upsertAccountAccessInvite: (
    input: UpsertAccountAccessInviteInput
  ) => Promise<
    Result<
      AccountAccessInviteSummary,
      | {
          readonly _tag: "AccountAccessTransitionNotAllowed";
          readonly currentStatus: AccountAccessStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listIncomingAccountInvites: (
    input: ListIncomingAccountInvitesInput
  ) => Promise<
    Result<
      readonly AccountAccessInviteSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;

  readonly respondToAccountAccessInvite: (
    input: RespondToAccountAccessInviteStoreInput
  ) => Promise<
    Result<
      AccountAccessInviteSummary,
      | { readonly _tag: "AccountAccessInviteNotFound" }
      | { readonly _tag: "ActorIsNotInviteRecipient" }
      | {
          readonly _tag: "AccountAccessTransitionNotAllowed";
          readonly currentStatus: AccountAccessStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly revokeAccountAccess: (
    input: RevokeAccountAccessStoreInput
  ) => Promise<
    Result<
      RevokeAccountAccessResult,
      | { readonly _tag: "AccountAccessInviteNotFound" }
      | { readonly _tag: "ActorDoesNotOwnMargonemAccount" }
      | {
          readonly _tag: "AccountAccessTransitionNotAllowed";
          readonly currentStatus: AccountAccessStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listSharedAccounts: (
    input: ListSharedAccountsInput
  ) => Promise<
    Result<
      readonly SharedMargonemAccountSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listAccountAccessGrants: (
    input: ListAccountAccessGrantsInput
  ) => Promise<
    Result<
      readonly AccountAccessGrantSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;
}

const usedStatuses = ["reserved", "succeeded", "failed"] as const;

const uniqueProfileIdConstraint = "margonem_accounts_profile_id_unique";

const escapeLikePattern = (value: string): string =>
  value.replaceAll(/[\\%_]/gu, "\\$&");

const isUniqueProfileIdViolation = (error: unknown): boolean => {
  if (error === null || typeof error !== "object") {
    return false;
  }

  if (!("code" in error) || !("constraint" in error)) {
    return false;
  }

  // SAFETY: The `in` checks above narrow error to have `code` and `constraint` properties.
  // Both are compared against string literals, so no data escapes or enters unsafely.
  const pgError = error as { code: string; constraint: string };
  return (
    pgError.code === "23505" && pgError.constraint === uniqueProfileIdConstraint
  );
};

/** Drizzle-backed squad-builder persistence adapter. */
export class DrizzleSquadBuilderStore
  implements
    SquadBuilderAccountLookup,
    FirecrawlRequestLedger,
    PendingMargonemAccountImportStore,
    OwnedMargonemAccountWriter,
    OwnedMargonemAccountReader,
    AccountSharingStore,
    MargonemAccountOwnerAuthorizer,
    RefetchableMargonemAccountReader,
    PendingMargonemAccountRefetchStore,
    RefetchedMargonemAccountWriter,
    SquadGroupStore,
    SquadGroupSharingStore,
    GlobalSquadVisibilityStore
{
  private readonly database: typeof defaultDb;

  constructor(database: typeof defaultDb = defaultDb) {
    this.database = database;
  }

  /** Find account ownership/access state for a profile. */
  async findProfileAccessState({
    actorUserId,
    profileId,
  }: FindProfileAccessStateInput): Promise<
    Result<ProfileAccessState, SquadBuilderPersistenceUnavailable>
  > {
    try {
      const [account] = await this.database
        .select({
          id: margonemAccount.id,
          ownerUserId: margonemAccount.ownerUserId,
        })
        .from(margonemAccount)
        .where(eq(margonemAccount.profileId, profileIdToNumber(profileId)))
        .limit(1);

      if (account === undefined) {
        return ok({ _tag: "Available" });
      }

      if (account.ownerUserId === appUserIdToString(actorUserId)) {
        return ok({ _tag: "OwnedByActor" });
      }

      const [access] = await this.database
        .select({ id: margonemAccountAccess.id })
        .from(margonemAccountAccess)
        .where(
          and(
            eq(margonemAccountAccess.accountId, account.id),
            eq(margonemAccountAccess.userId, appUserIdToString(actorUserId)),
            eq(margonemAccountAccess.status, "accepted")
          )
        )
        .limit(1);

      if (access !== undefined) {
        return ok({ _tag: "SharedWithActor" });
      }

      return ok({ _tag: "OwnedByAnotherUser" });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "findProfileAccessState",
      });
    }
  }

  /** Reserve one monthly Firecrawl request before calling Firecrawl. */
  async reserveRequest({
    monthlyRequestBudget,
    profileId,
    requestedByUserId,
    yearMonth,
  }: ReserveFirecrawlRequestInput): Promise<
    Result<ReservedFirecrawlRequest, FirecrawlBudgetError>
  > {
    try {
      return await this.database.transaction(async (transaction) => {
        const yearMonthText = firecrawlYearMonthToString(yearMonth);

        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`firecrawl:${yearMonthText}`}))`
        );

        const [usage] = await transaction
          .select({ usedRequests: count() })
          .from(firecrawlProfileScrapeRequest)
          .where(
            and(
              eq(firecrawlProfileScrapeRequest.yearMonth, yearMonthText),
              inArray(firecrawlProfileScrapeRequest.status, usedStatuses)
            )
          );

        const usedRequests = usage?.usedRequests ?? 0;

        if (usedRequests >= monthlyRequestBudget) {
          return err({
            _tag: "FirecrawlMonthlyBudgetExhausted",
            monthlyRequestBudget,
            usedRequests,
            yearMonth,
          });
        }

        const [reserved] = await transaction
          .insert(firecrawlProfileScrapeRequest)
          .values({
            profileId: profileIdToNumber(profileId),
            requestedByUserId: appUserIdToString(requestedByUserId),
            status: "reserved",
            yearMonth: yearMonthText,
          })
          .returning({ id: firecrawlProfileScrapeRequest.id });

        if (reserved === undefined) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable",
            cause: new Error("Failed to reserve Firecrawl request"),
            operation: "reserveRequest",
          });
        }

        const nextUsedRequests = usedRequests + 1;

        return ok({
          budgetState: {
            monthlyRequestBudget,
            remainingRequests: monthlyRequestBudget - nextUsedRequests,
            usedRequests: nextUsedRequests,
            yearMonth,
          },
          requestId: reserved.id,
        });
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "reserveRequest",
      });
    }
  }

  /** Mark a reserved Firecrawl request as successful. */
  async markRequestSucceeded({
    cacheState,
    creditsUsed,
    firecrawlStatusCode,
    requestId,
  }: MarkFirecrawlRequestSucceededInput): Promise<
    Result<void, SquadBuilderPersistenceUnavailable>
  > {
    try {
      await this.database
        .update(firecrawlProfileScrapeRequest)
        .set({
          cacheState,
          completedAt: new Date(),
          creditsUsed,
          firecrawlStatusCode,
          status: "succeeded",
        })
        .where(eq(firecrawlProfileScrapeRequest.id, requestId));

      return ok();
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "markRequestSucceeded",
      });
    }
  }

  /** Mark a reserved Firecrawl request as failed. */
  async markRequestFailed({
    errorTag,
    requestId,
  }: MarkFirecrawlRequestFailedInput): Promise<
    Result<void, SquadBuilderPersistenceUnavailable>
  > {
    try {
      await this.database
        .update(firecrawlProfileScrapeRequest)
        .set({ completedAt: new Date(), errorTag, status: "failed" })
        .where(eq(firecrawlProfileScrapeRequest.id, requestId));

      return ok();
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "markRequestFailed",
      });
    }
  }

  /** Store a successful preview as a pending import owned by the actor. */
  async createPendingImport({
    actorUserId,
    defaultDisplayName,
    expiresAt,
    fetchedAt,
    firecrawlCreditsUsed,
    jarunaCharacters,
    profileId,
    suggestedAccountName,
  }: CreatePendingMargonemAccountImportInput): Promise<
    Result<PendingMargonemAccountImport, SquadBuilderPersistenceUnavailable>
  > {
    try {
      return await this.database.transaction(async (transaction) => {
        const [preview] = await transaction
          .insert(margonemAccountImportPreview)
          .values({
            actorUserId: appUserIdToString(actorUserId),
            defaultDisplayName: accountDisplayNameToString(defaultDisplayName),
            expiresAt,
            fetchedAt,
            firecrawlCreditsUsed,
            profileId: profileIdToNumber(profileId),
            suggestedAccountName,
          })
          .returning({ id: margonemAccountImportPreview.id });

        if (preview === undefined) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable",
            cause: new Error("Failed to create pending import preview"),
            operation: "createPendingImport",
          });
        }

        if (jarunaCharacters.length > 0) {
          await transaction
            .insert(margonemAccountImportPreviewCharacter)
            .values(
              jarunaCharacters.map((character) => ({
                avatarUrl: character.avatarUrl,
                characterId: characterIdToNumber(character.characterId),
                importPreviewId: preview.id,
                level: levelToNumber(character.level),
                name: character.name,
                profession: character.profession,
                world: character.world,
              }))
            );
        }

        return ok({
          id: preview.id as PendingMargonemAccountImportId,
          profileId,
        });
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "createPendingImport",
      });
    }
  }

  /** Load a pending import for confirmation, ignoring confirmed/expired rows. */
  async findPendingImportForConfirmation({
    actorUserId,
    now,
    pendingImportId,
  }: FindPendingMargonemAccountImportInput): Promise<
    Result<
      PendingMargonemAccountImportForConfirmation,
      PendingMargonemAccountImportNotFound | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const [preview] = await this.database
        .select({
          fetchedAt: margonemAccountImportPreview.fetchedAt,
          id: margonemAccountImportPreview.id,
          profileId: margonemAccountImportPreview.profileId,
        })
        .from(margonemAccountImportPreview)
        .where(
          and(
            eq(
              margonemAccountImportPreview.id,
              pendingImportIdToNumber(pendingImportId)
            ),
            eq(
              margonemAccountImportPreview.actorUserId,
              appUserIdToString(actorUserId)
            ),
            isNull(margonemAccountImportPreview.confirmedAt),
            gt(margonemAccountImportPreview.expiresAt, now)
          )
        )
        .limit(1);

      if (preview === undefined) {
        return err({ _tag: "PendingMargonemAccountImportNotFound" });
      }

      const characterRows = await this.database
        .select({
          avatarUrl: margonemAccountImportPreviewCharacter.avatarUrl,
          characterId: margonemAccountImportPreviewCharacter.characterId,
          level: margonemAccountImportPreviewCharacter.level,
          name: margonemAccountImportPreviewCharacter.name,
          profession: margonemAccountImportPreviewCharacter.profession,
          world: margonemAccountImportPreviewCharacter.world,
        })
        .from(margonemAccountImportPreviewCharacter)
        .where(
          eq(margonemAccountImportPreviewCharacter.importPreviewId, preview.id)
        );

      const jarunaCharacters = characterRows.map((row) => {
        const characterId = parseMargonemCharacterId(row.characterId);
        if (isError(characterId)) {
          throw characterId.error;
        }
        const level = parsePositiveLevel(row.level);
        if (isError(level)) {
          throw level.error;
        }
        const profession = parseMargonemProfession(row.profession);
        if (isError(profession)) {
          throw profession.error;
        }
        const world = parseMargonemWorld(row.world);
        if (isError(world)) {
          throw world.error;
        }
        return {
          avatarUrl: row.avatarUrl,
          characterId: characterId.value,
          level: level.value,
          name: row.name,
          profession: profession.value,
          world: world.value,
        };
      });

      const profileId = parseMargonemProfileId(preview.profileId);
      if (isError(profileId)) {
        throw profileId.error;
      }

      return ok({
        actorUserId,
        fetchedAt: preview.fetchedAt,
        id: preview.id as PendingMargonemAccountImportId,
        jarunaCharacters,
        profileId: profileId.value,
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "findPendingImportForConfirmation",
      });
    }
  }

  /** Mark a pending import as confirmed. */
  async markPendingImportConfirmed({
    confirmedAt,
    pendingImportId,
  }: MarkPendingMargonemAccountImportConfirmedInput): Promise<
    Result<void, SquadBuilderPersistenceUnavailable>
  > {
    try {
      await this.database
        .update(margonemAccountImportPreview)
        .set({ confirmedAt })
        .where(
          eq(
            margonemAccountImportPreview.id,
            pendingImportIdToNumber(pendingImportId)
          )
        );

      return ok();
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "markPendingImportConfirmed",
      });
    }
  }

  /** Confirm a pending import into an owned account in one transaction. */
  async createOwnedAccountFromPendingImport({
    actorUserId,
    displayName,
    pending,
  }: CreateOwnedAccountFromPendingImportInput): Promise<
    Result<
      OwnedMargonemAccountSummary,
      DuplicateMargonemAccountError | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      return await this.database.transaction(async (transaction) => {
        const [existing] = await transaction
          .select({ ownerUserId: margonemAccount.ownerUserId })
          .from(margonemAccount)
          .where(
            eq(margonemAccount.profileId, profileIdToNumber(pending.profileId))
          )
          .limit(1);

        if (existing !== undefined) {
          return err(
            existing.ownerUserId === appUserIdToString(actorUserId)
              ? { _tag: "MargonemAccountAlreadyOwnedByActor" }
              : { _tag: "MargonemAccountOwnedByAnotherUser" }
          );
        }

        const [account] = await transaction
          .insert(margonemAccount)
          .values({
            displayName: accountDisplayNameToString(displayName),
            lastFetchedAt: pending.fetchedAt,
            ownerUserId: appUserIdToString(actorUserId),
            profileId: profileIdToNumber(pending.profileId),
          })
          .returning({
            createdAt: margonemAccount.createdAt,
            id: margonemAccount.id,
          });

        if (account === undefined) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable",
            cause: new Error("Failed to insert owned account"),
            operation: "createOwnedAccountFromPendingImport",
          });
        }

        if (pending.jarunaCharacters.length > 0) {
          await transaction.insert(margonemCharacter).values(
            pending.jarunaCharacters.map((character) => ({
              accountId: account.id,
              avatarUrl: character.avatarUrl,
              characterId: characterIdToNumber(character.characterId),
              level: levelToNumber(character.level),
              name: character.name,
              profession: character.profession,
              world: character.world,
            }))
          );
        }

        await transaction
          .update(margonemAccountImportPreview)
          .set({ confirmedAt: new Date() })
          .where(
            eq(
              margonemAccountImportPreview.id,
              pendingImportIdToNumber(pending.id)
            )
          );

        return ok({
          accountId: account.id,
          characterCount: pending.jarunaCharacters.length,
          displayName,
          generatedProfileUrl: toMargonemProfileUrl(pending.profileId),
          lastFetchedAt: pending.fetchedAt,
          profileId: pending.profileId,
        });
      });
    } catch (error: unknown) {
      if (isUniqueProfileIdViolation(error)) {
        const classified = await this.classifyDuplicateProfileId(
          actorUserId,
          pending.profileId
        );
        return err(classified);
      }

      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "createOwnedAccountFromPendingImport",
      });
    }
  }

  /** List Margonem accounts owned by the actor with Jaruna character counts. */
  async listOwnedAccounts({
    actorUserId,
  }: ListOwnedMargonemAccountsInput): Promise<
    Result<
      readonly OwnedMargonemAccountSummary[],
      SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const rows = await this.database
        .select({
          characterCount: sql<number>`count(${margonemCharacter.id})::int`.as(
            "character_count"
          ),
          createdAt: margonemAccount.createdAt,
          displayName: margonemAccount.displayName,
          id: margonemAccount.id,
          lastFetchedAt: margonemAccount.lastFetchedAt,
          profileId: margonemAccount.profileId,
        })
        .from(margonemAccount)
        .leftJoin(
          margonemCharacter,
          eq(margonemCharacter.accountId, margonemAccount.id)
        )
        .where(eq(margonemAccount.ownerUserId, appUserIdToString(actorUserId)))
        .groupBy(margonemAccount.id)
        .orderBy(desc(margonemAccount.createdAt), desc(margonemAccount.id));

      return ok(
        rows.map((row) => {
          const displayName = parseAccountDisplayName(row.displayName);
          if (isError(displayName)) {
            throw displayName.error;
          }
          const profileId = parseMargonemProfileId(row.profileId);
          if (isError(profileId)) {
            throw profileId.error;
          }
          return {
            accountId: row.id,
            characterCount: row.characterCount ?? 0,
            displayName: displayName.value,
            generatedProfileUrl: toMargonemProfileUrl(profileId.value),
            lastFetchedAt: row.lastFetchedAt ?? row.createdAt,
            profileId: profileId.value,
          };
        })
      );
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "listOwnedAccounts",
      });
    }
  }

  /** Authorize the actor as the owner of a Margonem account. */
  async authorizeOwner({
    actorUserId,
    accountId,
  }: {
    actorUserId: AppUserId;
    accountId: MargonemAccountId;
  }): Promise<
    Result<
      OwnedAccountForSharing,
      | { readonly _tag: "MargonemAccountNotFound" }
      | { readonly _tag: "ActorDoesNotOwnMargonemAccount" }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    const owned = await this.findOwnedAccountForSharing({
      accountId,
      actorUserId,
    });

    if (isError(owned)) {
      return err(owned.error);
    }

    if (owned.value.ownerUserId !== actorUserId) {
      return err({ _tag: "ActorDoesNotOwnMargonemAccount" });
    }

    return ok(owned.value);
  }

  /** Load a saved account and its current Jaruna characters for refetch diffing. */
  async getAccountForRefetch({
    accountId,
    actorUserId,
  }: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }): Promise<
    Result<
      RefetchableMargonemAccount,
      | MargonemAccountNotFound
      | ActorDoesNotOwnMargonemAccount
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const accountIdNum = margonemAccountIdToNumber(accountId);
      const [account] = await this.database
        .select({
          displayName: margonemAccount.displayName,
          ownerUserId: margonemAccount.ownerUserId,
          profileId: margonemAccount.profileId,
        })
        .from(margonemAccount)
        .where(eq(margonemAccount.id, accountIdNum))
        .limit(1);

      if (account === undefined) {
        return err({ _tag: "MargonemAccountNotFound" });
      }

      if (account.ownerUserId !== appUserIdToString(actorUserId)) {
        return err({ _tag: "ActorDoesNotOwnMargonemAccount" });
      }

      const characterRows = await this.database
        .select({
          affectedSquadCount: sql<number>`count(${squadCharacter.id})::int`,
          avatarUrl: margonemCharacter.avatarUrl,
          characterId: margonemCharacter.characterId,
          id: margonemCharacter.id,
          level: margonemCharacter.level,
          name: margonemCharacter.name,
          profession: margonemCharacter.profession,
          world: margonemCharacter.world,
        })
        .from(margonemCharacter)
        .leftJoin(
          squadCharacter,
          eq(squadCharacter.characterId, margonemCharacter.id)
        )
        .where(eq(margonemCharacter.accountId, accountIdNum))
        .groupBy(margonemCharacter.id);

      const displayName = parseAccountDisplayName(account.displayName);
      if (isError(displayName)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(
            `Unexpected account display name: ${account.displayName}`
          ),
          operation: "getAccountForRefetch",
        });
      }

      const profileId = parseMargonemProfileId(account.profileId);
      if (isError(profileId)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(
            `Unexpected account profile id: ${account.profileId}`
          ),
          operation: "getAccountForRefetch",
        });
      }

      const currentCharacters = characterRows.map((row) => {
        const margonemCharacterId = parseMargonemCharacterId(row.characterId);
        if (isError(margonemCharacterId)) {
          throw margonemCharacterId.error;
        }
        const level = parsePositiveLevel(row.level);
        if (isError(level)) {
          throw level.error;
        }
        const profession = parseMargonemProfession(row.profession);
        if (isError(profession)) {
          throw profession.error;
        }
        const world = parseMargonemWorld(row.world);
        if (isError(world)) {
          throw world.error;
        }
        return {
          affectedSquadCount: row.affectedSquadCount ?? 0,
          avatarUrl: row.avatarUrl,
          databaseCharacterId: row.id,
          level: level.value,
          margonemCharacterId: margonemCharacterId.value,
          name: row.name,
          profession: profession.value,
          world: world.value,
        };
      });

      return ok({
        accountId,
        currentCharacters,
        displayName: displayName.value,
        profileId: profileId.value,
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "getAccountForRefetch",
      });
    }
  }

  /** Store a successful manual refetch preview and its latest character rows. */
  async createPendingRefetch({
    accountId,
    actorUserId,
    diff,
    expiresAt,
    fetchedAt,
    firecrawlCreditsUsed,
    latestCharacters,
    profileId,
  }: CreatePendingMargonemAccountRefetchInput): Promise<
    Result<PendingMargonemAccountRefetch, SquadBuilderPersistenceUnavailable>
  > {
    try {
      return await this.database.transaction(async (transaction) => {
        const [preview] = await transaction
          .insert(margonemAccountRefetchPreview)
          .values({
            accountId: margonemAccountIdToNumber(accountId),
            actorUserId: appUserIdToString(actorUserId),
            diffJson: JSON.stringify(diff),
            expiresAt,
            fetchedAt,
            firecrawlCreditsUsed,
            profileId: profileIdToNumber(profileId),
          })
          .returning({ id: margonemAccountRefetchPreview.id });

        if (preview === undefined) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable",
            cause: new Error("Failed to create pending refetch preview"),
            operation: "createPendingRefetch",
          });
        }

        if (latestCharacters.length > 0) {
          await transaction
            .insert(margonemAccountRefetchPreviewCharacter)
            .values(
              latestCharacters.map((character) => ({
                avatarUrl: character.avatarUrl,
                characterId: characterIdToNumber(character.characterId),
                level: levelToNumber(character.level),
                name: character.name,
                profession: character.profession,
                refetchPreviewId: preview.id,
                world: character.world,
              }))
            );
        }

        return ok({ id: preview.id as PendingMargonemAccountRefetchId });
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "createPendingRefetch",
      });
    }
  }

  /** Load a pending manual refetch for application, ignoring expired/applied rows. */
  async findPendingRefetchForApply({
    actorUserId,
    now,
    refetchPreviewId,
  }: FindPendingMargonemAccountRefetchInput): Promise<
    Result<
      PendingMargonemAccountRefetchForApply,
      PendingMargonemAccountRefetchNotFound | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const [preview] = await this.database
        .select({
          accountId: margonemAccountRefetchPreview.accountId,
          actorUserId: margonemAccountRefetchPreview.actorUserId,
          fetchedAt: margonemAccountRefetchPreview.fetchedAt,
          id: margonemAccountRefetchPreview.id,
          profileId: margonemAccountRefetchPreview.profileId,
        })
        .from(margonemAccountRefetchPreview)
        .where(
          and(
            eq(
              margonemAccountRefetchPreview.id,
              pendingRefetchIdToNumber(refetchPreviewId)
            ),
            eq(
              margonemAccountRefetchPreview.actorUserId,
              appUserIdToString(actorUserId)
            ),
            isNull(margonemAccountRefetchPreview.appliedAt),
            gt(margonemAccountRefetchPreview.expiresAt, now)
          )
        )
        .limit(1);

      if (preview === undefined) {
        return err({ _tag: "PendingMargonemAccountRefetchNotFound" });
      }

      const characterRows = await this.database
        .select({
          avatarUrl: margonemAccountRefetchPreviewCharacter.avatarUrl,
          characterId: margonemAccountRefetchPreviewCharacter.characterId,
          level: margonemAccountRefetchPreviewCharacter.level,
          name: margonemAccountRefetchPreviewCharacter.name,
          profession: margonemAccountRefetchPreviewCharacter.profession,
          world: margonemAccountRefetchPreviewCharacter.world,
        })
        .from(margonemAccountRefetchPreviewCharacter)
        .where(
          eq(
            margonemAccountRefetchPreviewCharacter.refetchPreviewId,
            preview.id
          )
        );

      return ok({
        accountId: preview.accountId as MargonemAccountId,
        actorUserId: preview.actorUserId as AppUserId,
        fetchedAt: preview.fetchedAt,
        id: preview.id as PendingMargonemAccountRefetchId,
        latestCharacters: characterRows.map((row) => ({
          avatarUrl: row.avatarUrl,
          characterId:
            row.characterId as MargonemCharacterPreview["characterId"],
          level: row.level as MargonemCharacterPreview["level"],
          name: row.name,
          profession: row.profession as MargonemCharacterPreview["profession"],
          world: row.world as MargonemCharacterPreview["world"],
        })),
        profileId: preview.profileId as MargonemProfileId,
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "findPendingRefetchForApply",
      });
    }
  }

  /** Mark a pending manual refetch as applied. */
  async markPendingRefetchApplied({
    appliedAt,
    refetchPreviewId,
  }: MarkPendingMargonemAccountRefetchAppliedInput): Promise<
    Result<void, SquadBuilderPersistenceUnavailable>
  > {
    try {
      await this.database
        .update(margonemAccountRefetchPreview)
        .set({ appliedAt })
        .where(
          eq(
            margonemAccountRefetchPreview.id,
            pendingRefetchIdToNumber(refetchPreviewId)
          )
        );

      return ok();
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "markPendingRefetchApplied",
      });
    }
  }

  /** Transactionally apply latest Jaruna characters to a saved account. */
  async applyRefetchedAccount({
    actorUserId,
    now,
    pendingRefetch,
  }: ApplyRefetchedAccountInput): Promise<
    Result<ApplyAccountRefetchOutput, SquadBuilderPersistenceUnavailable>
  > {
    try {
      return await this.database.transaction(async (transaction) => {
        const accountIdNum = margonemAccountIdToNumber(
          pendingRefetch.accountId
        );

        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`margonem-refetch:${accountIdNum}`}))`
        );

        const [account] = await transaction
          .select({
            id: margonemAccount.id,
            ownerUserId: margonemAccount.ownerUserId,
          })
          .from(margonemAccount)
          .where(
            and(
              eq(margonemAccount.id, accountIdNum),
              eq(margonemAccount.ownerUserId, appUserIdToString(actorUserId))
            )
          )
          .limit(1);

        if (account === undefined) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable",
            cause: new Error("Account not found while applying refetch"),
            operation: "applyRefetchedAccount",
          });
        }

        const currentRows = await transaction
          .select({
            avatarUrl: margonemCharacter.avatarUrl,
            characterId: margonemCharacter.characterId,
            id: margonemCharacter.id,
            level: margonemCharacter.level,
            name: margonemCharacter.name,
            profession: margonemCharacter.profession,
          })
          .from(margonemCharacter)
          .where(eq(margonemCharacter.accountId, accountIdNum));

        const currentByCharacterId = new Map<
          number,
          (typeof currentRows)[number]
        >();
        for (const current of currentRows) {
          currentByCharacterId.set(current.characterId, current);
        }

        const latestByCharacterId = new Map<number, MargonemCharacterPreview>();
        for (const latest of pendingRefetch.latestCharacters) {
          latestByCharacterId.set(
            characterIdToNumber(latest.characterId),
            latest
          );
        }

        const charactersToInsert: {
          readonly accountId: number;
          readonly avatarUrl: string | null;
          readonly characterId: number;
          readonly level: number;
          readonly name: string;
          readonly profession: string;
          readonly updatedAt: Date;
          readonly world: string;
        }[] = [];
        const charactersToUpdate: {
          readonly avatarUrl: string | null;
          readonly databaseCharacterId: number;
          readonly level: number;
          readonly name: string;
          readonly profession: string;
          readonly world: string;
        }[] = [];
        const removedDatabaseCharacterIds: number[] = [];

        for (const latest of pendingRefetch.latestCharacters) {
          const latestCharacterId = characterIdToNumber(latest.characterId);
          const current = currentByCharacterId.get(latestCharacterId);
          const latestLevel = levelToNumber(latest.level);

          if (current === undefined) {
            charactersToInsert.push({
              accountId: accountIdNum,
              avatarUrl: latest.avatarUrl,
              characterId: latestCharacterId,
              level: latestLevel,
              name: latest.name,
              profession: latest.profession,
              updatedAt: now,
              world: latest.world,
            });
            continue;
          }

          const changed =
            current.avatarUrl !== latest.avatarUrl ||
            current.level !== latestLevel ||
            current.name !== latest.name ||
            current.profession !== latest.profession;

          if (changed) {
            charactersToUpdate.push({
              avatarUrl: latest.avatarUrl,
              databaseCharacterId: current.id,
              level: latestLevel,
              name: latest.name,
              profession: latest.profession,
              world: latest.world,
            });
          }
        }

        if (charactersToInsert.length > 0) {
          await transaction
            .insert(margonemCharacter)
            .values(charactersToInsert);
        }

        await Promise.all(
          charactersToUpdate.map((character) =>
            transaction
              .update(margonemCharacter)
              .set({
                avatarUrl: character.avatarUrl,
                level: character.level,
                name: character.name,
                profession: character.profession,
                updatedAt: now,
                world: character.world,
              })
              .where(eq(margonemCharacter.id, character.databaseCharacterId))
          )
        );

        for (const current of currentRows) {
          if (!latestByCharacterId.has(current.characterId)) {
            removedDatabaseCharacterIds.push(current.id);
          }
        }

        let removedSquadCharacterCount = 0;

        if (removedDatabaseCharacterIds.length > 0) {
          const affectedGroups = await transaction
            .select({ groupId: squadCharacter.squadGroupId })
            .from(squadCharacter)
            .where(
              inArray(squadCharacter.characterId, removedDatabaseCharacterIds)
            );
          const affectedGroupIds = [
            ...new Set(affectedGroups.map((group) => group.groupId)),
          ];

          const removedPlacements = await transaction
            .delete(squadCharacter)
            .where(
              inArray(squadCharacter.characterId, removedDatabaseCharacterIds)
            )
            .returning({ id: squadCharacter.id });
          removedSquadCharacterCount = removedPlacements.length;

          if (affectedGroupIds.length > 0) {
            await transaction
              .update(squadGroup)
              .set({ updatedAt: now })
              .where(inArray(squadGroup.id, affectedGroupIds));
          }

          await transaction
            .delete(margonemCharacter)
            .where(inArray(margonemCharacter.id, removedDatabaseCharacterIds));
        }

        await transaction
          .update(margonemAccount)
          .set({ lastFetchedAt: pendingRefetch.fetchedAt, updatedAt: now })
          .where(eq(margonemAccount.id, accountIdNum));

        return ok({
          accountId: pendingRefetch.accountId,
          addedCharacterCount: charactersToInsert.length,
          lastFetchedAt: pendingRefetch.fetchedAt,
          profileId: pendingRefetch.profileId,
          removedCharacterCount: removedDatabaseCharacterIds.length,
          removedSquadCharacterCount,
          updatedCharacterCount: charactersToUpdate.length,
        });
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "applyRefetchedAccount",
      });
    }
  }

  /** Search verified users the account owner may invite. */
  async searchInviteTargets({
    accountId,
    actorUserId,
    query,
  }: SearchInviteTargetsStoreInput): Promise<
    Result<readonly AccountInviteTarget[], SquadBuilderPersistenceUnavailable>
  > {
    try {
      const accountIdNum = margonemAccountIdToNumber(accountId);
      const actor = appUserIdToString(actorUserId);

      const rows = await this.database
        .select({
          image: user.image,
          name: user.name,
          userId: user.id,
        })
        .from(user)
        .where(
          and(
            eq(user.verified, true),
            ne(user.id, actor),
            ilike(user.name, `%${query}%`),
            not(
              sql`${user.id} in (
                select ${margonemAccountAccess.userId}
                from ${margonemAccountAccess}
                where ${margonemAccountAccess.accountId} = ${accountIdNum}
                  and ${margonemAccountAccess.status} in ('pending', 'accepted')
              )`
            )
          )
        )
        .orderBy(user.name)
        .limit(10);

      return ok(
        rows.map((row) => {
          const userId = parseAppUserId(row.userId);
          if (isError(userId)) {
            throw userId.error;
          }
          return {
            image: row.image,
            name: row.name,
            userId: userId.value,
          };
        })
      );
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "searchInviteTargets",
      });
    }
  }

  /** Load an owned account for sharing authorization. */
  async findOwnedAccountForSharing({
    accountId,
  }: FindOwnedAccountForSharingInput): Promise<
    Result<
      OwnedAccountForSharing,
      | { readonly _tag: "MargonemAccountNotFound" }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const [account] = await this.database
        .select({
          createdAt: margonemAccount.createdAt,
          displayName: margonemAccount.displayName,
          id: margonemAccount.id,
          lastFetchedAt: margonemAccount.lastFetchedAt,
          ownerUserId: margonemAccount.ownerUserId,
          profileId: margonemAccount.profileId,
        })
        .from(margonemAccount)
        .where(eq(margonemAccount.id, margonemAccountIdToNumber(accountId)))
        .limit(1);

      if (account === undefined) {
        return err({ _tag: "MargonemAccountNotFound" });
      }

      const displayName = parseAccountDisplayName(account.displayName);
      if (isError(displayName)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(
            `Unexpected account display name: ${account.displayName}`
          ),
          operation: "findOwnedAccountForSharing",
        });
      }

      const ownerUserId = parseAppUserId(account.ownerUserId);
      if (isError(ownerUserId)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(
            `Unexpected account owner user id: ${account.ownerUserId}`
          ),
          operation: "findOwnedAccountForSharing",
        });
      }

      const profileId = parseMargonemProfileId(account.profileId);
      if (isError(profileId)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(
            `Unexpected account profile id: ${account.profileId}`
          ),
          operation: "findOwnedAccountForSharing",
        });
      }

      return ok({
        accountId,
        displayName: displayName.value,
        generatedProfileUrl: undefined,
        ownerUserId: ownerUserId.value,
        profileId: profileId.value,
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "findOwnedAccountForSharing",
      });
    }
  }

  /** Resolve a verified invite target by user id. */
  async findVerifiedInviteTarget({
    targetUserId,
  }: FindVerifiedInviteTargetInput): Promise<
    Result<
      VerifiedInviteTarget,
      | { readonly _tag: "InviteTargetNotFound" }
      | { readonly _tag: "InviteTargetNotVerified" }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const [target] = await this.database
        .select({
          image: user.image,
          name: user.name,
          userId: user.id,
          verified: user.verified,
        })
        .from(user)
        .where(eq(user.id, appUserIdToString(targetUserId)))
        .limit(1);

      if (target === undefined) {
        return err({ _tag: "InviteTargetNotFound" });
      }

      if (!target.verified) {
        return err({ _tag: "InviteTargetNotVerified" });
      }

      const userId = parseAppUserId(target.userId);
      if (isError(userId)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(`Unexpected user id: ${target.userId}`),
          operation: "findVerifiedInviteTarget",
        });
      }

      return ok({
        image: target.image,
        name: target.name,
        userId: userId.value,
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "findVerifiedInviteTarget",
      });
    }
  }

  /** Send or re-send an account access invite as the account owner. */
  async upsertAccountAccessInvite({
    accountId,
    invitedUserId,
    now,
    ownerUserId,
  }: UpsertAccountAccessInviteInput): Promise<
    Result<
      AccountAccessInviteSummary,
      | {
          readonly _tag: "AccountAccessTransitionNotAllowed";
          readonly currentStatus: AccountAccessStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const accountIdNum = margonemAccountIdToNumber(accountId);
      const invitedUser = appUserIdToString(invitedUserId);
      const owner = appUserIdToString(ownerUserId);

      const upsert = await this.database.transaction<
        Result<
          MargonemAccountAccessId,
          | {
              readonly _tag: "AccountAccessTransitionNotAllowed";
              readonly currentStatus: AccountAccessStatus;
              readonly attempted: string;
            }
          | SquadBuilderPersistenceUnavailable
        >
      >(async (transaction) => {
        const [existing] = await transaction
          .select({
            id: margonemAccountAccess.id,
            status: margonemAccountAccess.status,
          })
          .from(margonemAccountAccess)
          .where(
            and(
              eq(margonemAccountAccess.accountId, accountIdNum),
              eq(margonemAccountAccess.userId, invitedUser)
            )
          )
          .limit(1);

        if (existing === undefined) {
          const [inserted] = await transaction
            .insert(margonemAccountAccess)
            .values({
              accountId: accountIdNum,
              invitedByUserId: owner,
              status: "pending",
              userId: invitedUser,
            })
            .returning({ id: margonemAccountAccess.id });

          if (inserted === undefined) {
            return err({
              _tag: "SquadBuilderPersistenceUnavailable",
              cause: new Error("Failed to insert account access invite"),
              operation: "upsertAccountAccessInvite",
            });
          }

          return ok(inserted.id as MargonemAccountAccessId);
        }

        const status = parseAccountAccessStatus(existing.status);

        if (isError(status)) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable",
            cause: new Error(
              `Unexpected account access status: ${existing.status}`
            ),
            operation: "upsertAccountAccessInvite",
          });
        }

        if (!canTransitionAccountAccess(status.value, "pending")) {
          return err({
            _tag: "AccountAccessTransitionNotAllowed",
            attempted: "pending",
            currentStatus: status.value,
          });
        }

        const [updated] = await transaction
          .update(margonemAccountAccess)
          .set({ invitedByUserId: owner, status: "pending", updatedAt: now })
          .where(eq(margonemAccountAccess.id, existing.id))
          .returning({ id: margonemAccountAccess.id });

        if (updated === undefined) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable",
            cause: new Error("Failed to re-send account access invite"),
            operation: "upsertAccountAccessInvite",
          });
        }

        return ok(updated.id as MargonemAccountAccessId);
      });

      if (isError(upsert)) {
        return err(upsert.error);
      }

      const summary = await this.loadAccountAccessInviteSummary(upsert.value);

      if (isError(summary)) {
        // The invite row was just written; a missing summary is a consistency
        // defect, surfaced as persistence unavailable rather than not-found.
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error("Account access invite vanished after upsert"),
          operation: "upsertAccountAccessInvite",
        });
      }

      return ok(summary.value);
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "upsertAccountAccessInvite",
      });
    }
  }

  /** List pending account access invites received by the actor. */
  async listIncomingAccountInvites({
    actorUserId,
  }: ListIncomingAccountInvitesInput): Promise<
    Result<
      readonly AccountAccessInviteSummary[],
      SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const rows = await this.database
        .select({
          accessId: margonemAccountAccess.id,
          accountDisplayName: margonemAccount.displayName,
          accountId: margonemAccountAccess.accountId,
          createdAt: margonemAccountAccess.createdAt,
          invitedUserId: margonemAccountAccess.userId,
          ownerId: user.id,
          ownerImage: user.image,
          ownerName: user.name,
          profileId: margonemAccount.profileId,
          status: margonemAccountAccess.status,
          updatedAt: margonemAccountAccess.updatedAt,
        })
        .from(margonemAccountAccess)
        .innerJoin(
          margonemAccount,
          eq(margonemAccount.id, margonemAccountAccess.accountId)
        )
        .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
        .where(
          and(
            eq(margonemAccountAccess.userId, appUserIdToString(actorUserId)),
            eq(margonemAccountAccess.status, "pending")
          )
        )
        .orderBy(desc(margonemAccountAccess.createdAt));

      return ok(
        rows.map((row) => {
          const status = parseAccountAccessStatus(row.status);

          // The persisted status is constrained by the write path; a failure
          // here signals data corruption, surfaced as persistence unavailable.
          if (isError(status)) {
            throw status.error;
          }

          const accessId = parseMargonemAccountAccessId(row.accessId);
          if (isError(accessId)) {
            throw accessId.error;
          }
          const accountDisplayName = parseAccountDisplayName(
            row.accountDisplayName
          );
          if (isError(accountDisplayName)) {
            throw accountDisplayName.error;
          }
          const accountId = row.accountId as MargonemAccountId;
          const profileId = parseMargonemProfileId(row.profileId);
          if (isError(profileId)) {
            throw profileId.error;
          }
          const invitedUserId = parseAppUserId(row.invitedUserId);
          if (isError(invitedUserId)) {
            throw invitedUserId.error;
          }
          const ownerUserId = parseAppUserId(row.ownerId);
          if (isError(ownerUserId)) {
            throw ownerUserId.error;
          }

          return {
            accessId: accessId.value,
            accountDisplayName: accountDisplayName.value,
            accountId,
            createdAt: row.createdAt,
            generatedProfileUrl: toMargonemProfileUrl(profileId.value),
            invitedUserId: invitedUserId.value,
            ownerUserId: ownerUserId.value,
            ownerUserImage: row.ownerImage,
            ownerUserName: row.ownerName,
            status: status.value,
            updatedAt: row.updatedAt,
          };
        })
      );
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "listIncomingAccountInvites",
      });
    }
  }

  /** Accept or decline an account access invite as the invited user. */
  async respondToAccountAccessInvite({
    accessId,
    invitedUserId,
    now,
    response,
  }: RespondToAccountAccessInviteStoreInput): Promise<
    Result<
      AccountAccessInviteSummary,
      | { readonly _tag: "AccountAccessInviteNotFound" }
      | { readonly _tag: "ActorIsNotInviteRecipient" }
      | {
          readonly _tag: "AccountAccessTransitionNotAllowed";
          readonly currentStatus: AccountAccessStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const respond = await this.database.transaction<
        Result<
          MargonemAccountAccessId,
          | { readonly _tag: "AccountAccessInviteNotFound" }
          | { readonly _tag: "ActorIsNotInviteRecipient" }
          | {
              readonly _tag: "AccountAccessTransitionNotAllowed";
              readonly currentStatus: AccountAccessStatus;
              readonly attempted: string;
            }
          | SquadBuilderPersistenceUnavailable
        >
      >(async (transaction) => {
        const [existing] = await transaction
          .select({
            id: margonemAccountAccess.id,
            status: margonemAccountAccess.status,
            userId: margonemAccountAccess.userId,
          })
          .from(margonemAccountAccess)
          .where(
            eq(
              margonemAccountAccess.id,
              margonemAccountAccessIdToNumber(accessId)
            )
          )
          .limit(1);

        if (existing === undefined) {
          return err({ _tag: "AccountAccessInviteNotFound" });
        }

        if (existing.userId !== appUserIdToString(invitedUserId)) {
          return err({ _tag: "ActorIsNotInviteRecipient" });
        }

        const status = parseAccountAccessStatus(existing.status);

        if (isError(status)) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable",
            cause: new Error(
              `Unexpected account access status: ${existing.status}`
            ),
            operation: "respondToAccountAccessInvite",
          });
        }

        const nextStatus: AccountAccessStatus =
          response === "accept" ? "accepted" : "declined";

        if (!canTransitionAccountAccess(status.value, nextStatus)) {
          return err({
            _tag: "AccountAccessTransitionNotAllowed",
            attempted: nextStatus,
            currentStatus: status.value,
          });
        }

        const [updated] = await transaction
          .update(margonemAccountAccess)
          .set({ status: nextStatus, updatedAt: now })
          .where(eq(margonemAccountAccess.id, existing.id))
          .returning({ id: margonemAccountAccess.id });

        if (updated === undefined) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable",
            cause: new Error("Failed to update account access invite"),
            operation: "respondToAccountAccessInvite",
          });
        }

        return ok(accessId);
      });

      if (isError(respond)) {
        return err(respond.error);
      }

      return this.loadAccountAccessInviteSummary(accessId);
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "respondToAccountAccessInvite",
      });
    }
  }

  /** Revoke pending or accepted account access as the account owner. */
  async revokeAccountAccess({
    accessId,
    now,
    ownerUserId,
  }: RevokeAccountAccessStoreInput): Promise<
    Result<
      RevokeAccountAccessResult,
      | { readonly _tag: "AccountAccessInviteNotFound" }
      | { readonly _tag: "ActorDoesNotOwnMargonemAccount" }
      | {
          readonly _tag: "AccountAccessTransitionNotAllowed";
          readonly currentStatus: AccountAccessStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      return await this.database.transaction(async (transaction) => {
        const accessIdNum = margonemAccountAccessIdToNumber(accessId);
        const owner = appUserIdToString(ownerUserId);

        const [access] = await transaction
          .select({
            accountId: margonemAccountAccess.accountId,
            status: margonemAccountAccess.status,
            userId: margonemAccountAccess.userId,
          })
          .from(margonemAccountAccess)
          .where(eq(margonemAccountAccess.id, accessIdNum))
          .limit(1);

        if (access === undefined) {
          return err({ _tag: "AccountAccessInviteNotFound" });
        }

        const [account] = await transaction
          .select({ ownerUserId: margonemAccount.ownerUserId })
          .from(margonemAccount)
          .where(eq(margonemAccount.id, access.accountId))
          .limit(1);

        if (account === undefined) {
          return err({ _tag: "AccountAccessInviteNotFound" });
        }

        if (account.ownerUserId !== owner) {
          return err({ _tag: "ActorDoesNotOwnMargonemAccount" });
        }

        const status = parseAccountAccessStatus(access.status);

        if (isError(status)) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable",
            cause: new Error(
              `Unexpected account access status: ${access.status}`
            ),
            operation: "revokeAccountAccess",
          });
        }

        if (!canTransitionAccountAccess(status.value, "revoked")) {
          return err({
            _tag: "AccountAccessTransitionNotAllowed",
            attempted: "revoked",
            currentStatus: status.value,
          });
        }

        await transaction
          .update(margonemAccountAccess)
          .set({ status: "revoked", updatedAt: now })
          .where(eq(margonemAccountAccess.id, accessIdNum));

        let removedSquadCharacterCount = 0;

        if (status.value === "accepted") {
          const accountCharacters = await transaction
            .select({ id: margonemCharacter.id })
            .from(margonemCharacter)
            .where(eq(margonemCharacter.accountId, access.accountId));
          const accountCharacterIds = accountCharacters.map(
            (character) => character.id
          );

          if (accountCharacterIds.length > 0) {
            const affectedGroups = await transaction
              .select({ groupId: squadCharacter.squadGroupId })
              .from(squadCharacter)
              .innerJoin(
                squadGroup,
                eq(squadGroup.id, squadCharacter.squadGroupId)
              )
              .where(
                and(
                  inArray(squadCharacter.characterId, accountCharacterIds),
                  eq(squadGroup.ownerUserId, access.userId)
                )
              );
            const affectedGroupIds = [
              ...new Set(affectedGroups.map((group) => group.groupId)),
            ];

            if (affectedGroupIds.length > 0) {
              const removedPlacements = await transaction
                .delete(squadCharacter)
                .where(
                  and(
                    inArray(squadCharacter.characterId, accountCharacterIds),
                    inArray(squadCharacter.squadGroupId, affectedGroupIds)
                  )
                )
                .returning({ id: squadCharacter.id });
              removedSquadCharacterCount = removedPlacements.length;

              await transaction
                .update(squadGroup)
                .set({ updatedAt: now })
                .where(inArray(squadGroup.id, affectedGroupIds));
            }
          }
        }

        return ok({
          accessId,
          accountId: access.accountId as MargonemAccountId,
          removedSquadCharacterCount,
          revokedUserId: access.userId as AppUserId,
        });
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "revokeAccountAccess",
      });
    }
  }

  /** List Margonem accounts shared with (accepted by) the actor. */
  async listSharedAccounts({
    actorUserId,
  }: ListSharedAccountsInput): Promise<
    Result<
      readonly SharedMargonemAccountSummary[],
      SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const rows = await this.database
        .select({
          accountId: margonemAccount.id,
          characterCount: sql<number>`count(${margonemCharacter.id})::int`.as(
            "character_count"
          ),
          createdAt: margonemAccount.createdAt,
          displayName: margonemAccount.displayName,
          lastFetchedAt: margonemAccount.lastFetchedAt,
          ownerId: user.id,
          ownerImage: user.image,
          ownerName: user.name,
          profileId: margonemAccount.profileId,
        })
        .from(margonemAccountAccess)
        .innerJoin(
          margonemAccount,
          eq(margonemAccount.id, margonemAccountAccess.accountId)
        )
        .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
        .leftJoin(
          margonemCharacter,
          eq(margonemCharacter.accountId, margonemAccount.id)
        )
        .where(
          and(
            eq(margonemAccountAccess.userId, appUserIdToString(actorUserId)),
            eq(margonemAccountAccess.status, "accepted")
          )
        )
        .groupBy(margonemAccount.id, user.id)
        .orderBy(desc(margonemAccount.createdAt), desc(margonemAccount.id));

      return ok(
        rows.map((row) => {
          const displayName = parseAccountDisplayName(row.displayName);
          if (isError(displayName)) {
            throw displayName.error;
          }
          const profileId = parseMargonemProfileId(row.profileId);
          if (isError(profileId)) {
            throw profileId.error;
          }
          const ownerUserId = parseAppUserId(row.ownerId);
          if (isError(ownerUserId)) {
            throw ownerUserId.error;
          }
          return {
            accountId: row.accountId as MargonemAccountId,
            characterCount: row.characterCount ?? 0,
            displayName: displayName.value,
            generatedProfileUrl: toMargonemProfileUrl(profileId.value),
            lastFetchedAt: row.lastFetchedAt ?? row.createdAt,
            ownerUserId: ownerUserId.value,
            ownerUserImage: row.ownerImage,
            ownerUserName: row.ownerName,
            profileId: profileId.value,
          };
        })
      );
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "listSharedAccounts",
      });
    }
  }

  /** List pending and accepted access grants for an owned account. */
  async listAccountAccessGrants({
    accountId,
  }: ListAccountAccessGrantsInput): Promise<
    Result<
      readonly AccountAccessGrantSummary[],
      SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const rows = await this.database
        .select({
          accessId: margonemAccountAccess.id,
          createdAt: margonemAccountAccess.createdAt,
          image: user.image,
          name: user.name,
          status: margonemAccountAccess.status,
          updatedAt: margonemAccountAccess.updatedAt,
          userId: user.id,
        })
        .from(margonemAccountAccess)
        .innerJoin(user, eq(user.id, margonemAccountAccess.userId))
        .where(
          and(
            eq(
              margonemAccountAccess.accountId,
              margonemAccountIdToNumber(accountId)
            ),
            inArray(margonemAccountAccess.status, ["pending", "accepted"])
          )
        )
        .orderBy(desc(margonemAccountAccess.createdAt));

      return ok(
        rows.map((row) => {
          const status = parseAccountAccessStatus(row.status);
          if (isError(status)) {
            throw status.error;
          }
          const userId = parseAppUserId(row.userId);
          if (isError(userId)) {
            throw userId.error;
          }
          // SAFETY: The WHERE clause constrains status to ["pending", "accepted"].
          const grantStatus: Extract<
            AccountAccessStatus,
            "pending" | "accepted"
          > =
            status.value === "pending" || status.value === "accepted"
              ? status.value
              : (() => {
                  throw new Error(
                    `Unexpected status after WHERE filter: ${status.value}`
                  );
                })();
          return {
            accessId: row.accessId as MargonemAccountAccessId,
            createdAt: row.createdAt,
            invitedUserId: userId.value,
            invitedUserImage: row.image,
            invitedUserName: row.name,
            status: grantStatus,
            updatedAt: row.updatedAt,
          };
        })
      );
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "listAccountAccessGrants",
      });
    }
  }

  /** Authorize the actor as the owner of a squad group. */
  async authorizeSquadGroupOwner({
    actorUserId,
    groupId,
  }: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Promise<
    Result<
      SquadGroupOwnerAccess,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const [group] = await this.database
        .select({ ownerUserId: squadGroup.ownerUserId })
        .from(squadGroup)
        .where(eq(squadGroup.id, squadGroupIdToNumber(groupId)))
        .limit(1);

      if (group === undefined) {
        return err({ _tag: "SquadGroupNotFound" });
      }

      if (group.ownerUserId !== appUserIdToString(actorUserId)) {
        return err({ _tag: "ActorDoesNotOwnSquadGroup" });
      }

      return ok({
        _tag: "SquadGroupOwnerAccess",
        groupId,
        ownerUserId: actorUserId,
        role: "owner",
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "authorizeSquadGroupOwner",
      });
    }
  }

  /** Authorize owner, accepted editor, or global viewer access. */
  async authorizeSquadGroupViewer({
    actorUserId,
    groupId,
  }: AuthorizeSquadGroupViewerInput): Promise<
    Result<
      SquadGroupAccess,
      | SquadGroupNotFound
      | ActorCannotViewSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const groupIdNum = squadGroupIdToNumber(groupId);
      const actor = appUserIdToString(actorUserId);
      const [group] = await this.database
        .select({
          ownerUserId: squadGroup.ownerUserId,
          visibility: squadGroup.visibility,
        })
        .from(squadGroup)
        .where(eq(squadGroup.id, groupIdNum))
        .limit(1);

      if (group === undefined) {
        return err({ _tag: "SquadGroupNotFound" });
      }

      const ownerUserId = parseAppUserId(group.ownerUserId);
      if (isError(ownerUserId)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(
            `Unexpected squad group owner id: ${group.ownerUserId}`
          ),
          operation: "authorizeSquadGroupViewer",
        });
      }

      if (group.ownerUserId === actor) {
        return ok({
          _tag: "SquadGroupOwnerAccess",
          groupId,
          ownerUserId: actorUserId,
          role: "owner",
        });
      }

      const [invite] = await this.database
        .select({ id: squadGroupInvitation.id })
        .from(squadGroupInvitation)
        .where(
          and(
            eq(squadGroupInvitation.squadGroupId, groupIdNum),
            eq(squadGroupInvitation.invitedUserId, actor),
            eq(squadGroupInvitation.status, "accepted")
          )
        )
        .limit(1);

      if (invite !== undefined) {
        return ok({
          _tag: "SquadGroupEditorAccess",
          editorUserId: actorUserId,
          groupId,
          invitationId: invite.id as SquadGroupInvitationId,
          ownerUserId: ownerUserId.value,
          role: "editor",
        });
      }

      const visibility = parseSquadGroupVisibility(group.visibility);
      if (isError(visibility)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(
            `Unexpected squad group visibility: ${group.visibility}`
          ),
          operation: "authorizeSquadGroupViewer",
        });
      }

      if (visibility.value !== "global") {
        return err({ _tag: "ActorCannotViewSquadGroup" });
      }

      return ok({
        _tag: "SquadGroupViewerAccess",
        groupId,
        ownerUserId: ownerUserId.value,
        role: "viewer",
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "authorizeSquadGroupViewer",
      });
    }
  }

  /** Authorize owner or accepted editor placement-editing access. */
  authorizeSquadGroupEditor(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Promise<
    Result<
      SquadGroupAccess,
      | SquadGroupNotFound
      | ActorCannotEditSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  > {
    return this.resolveSquadGroupAccess(input);
  }

  /** Search verified users the squad group owner may invite. */
  async searchSquadEditorInviteTargets({
    groupId,
    maxResults,
    ownerUserId,
    query,
  }: SearchSquadEditorInviteTargetsStoreInput): Promise<
    Result<
      readonly SquadEditorInviteTarget[],
      SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const groupIdNum = squadGroupIdToNumber(groupId);
      const owner = appUserIdToString(ownerUserId);
      const rows = await this.database
        .select({ image: user.image, name: user.name, userId: user.id })
        .from(user)
        .where(
          and(
            eq(user.verified, true),
            ne(user.id, owner),
            ilike(user.name, `%${query}%`),
            not(
              sql`${user.id} in (
                select ${squadGroupInvitation.invitedUserId}
                from ${squadGroupInvitation}
                where ${squadGroupInvitation.squadGroupId} = ${groupIdNum}
                  and ${squadGroupInvitation.status} in ('pending', 'accepted')
              )`
            )
          )
        )
        .orderBy(user.name)
        .limit(maxResults);

      return ok(
        rows.map((row) => {
          const userId = parseAppUserId(row.userId);
          if (isError(userId)) {
            throw userId.error;
          }
          return {
            image: row.image,
            name: row.name,
            userId: userId.value,
          };
        })
      );
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "searchSquadEditorInviteTargets",
      });
    }
  }

  /** Resolve a verified squad editor invite target by user id. */
  async findVerifiedSquadEditorInviteTarget({
    targetUserId,
  }: {
    readonly targetUserId: AppUserId;
  }): Promise<
    Result<
      SquadEditorInviteTarget,
      | { readonly _tag: "SquadEditorInviteTargetNotFound" }
      | { readonly _tag: "SquadEditorInviteTargetNotVerified" }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const [target] = await this.database
        .select({
          image: user.image,
          name: user.name,
          userId: user.id,
          verified: user.verified,
        })
        .from(user)
        .where(eq(user.id, appUserIdToString(targetUserId)))
        .limit(1);

      if (target === undefined) {
        return err({ _tag: "SquadEditorInviteTargetNotFound" });
      }

      if (!target.verified) {
        return err({ _tag: "SquadEditorInviteTargetNotVerified" });
      }

      const userId = parseAppUserId(target.userId);
      if (isError(userId)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(`Unexpected user id: ${target.userId}`),
          operation: "findVerifiedSquadEditorInviteTarget",
        });
      }

      return ok({
        image: target.image,
        name: target.name,
        userId: userId.value,
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "findVerifiedSquadEditorInviteTarget",
      });
    }
  }

  /** Send or re-send a squad group editor invite as group owner. */
  async upsertSquadGroupEditorInvite({
    groupId,
    invitedUserId,
    now,
    ownerUserId,
  }: UpsertSquadGroupEditorInviteInput): Promise<
    Result<
      SquadGroupInvitationSummary,
      | {
          readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
          readonly currentStatus: SquadGroupInvitationStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const inviteId = await this.database.transaction<
        Result<
          SquadGroupInvitationId,
          | {
              readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
              readonly currentStatus: SquadGroupInvitationStatus;
              readonly attempted: string;
            }
          | SquadBuilderPersistenceUnavailable
        >
      >(async (transaction) => {
        const [existing] = await transaction
          .select({
            id: squadGroupInvitation.id,
            status: squadGroupInvitation.status,
          })
          .from(squadGroupInvitation)
          .where(
            and(
              eq(
                squadGroupInvitation.squadGroupId,
                squadGroupIdToNumber(groupId)
              ),
              eq(
                squadGroupInvitation.invitedUserId,
                appUserIdToString(invitedUserId)
              )
            )
          )
          .limit(1);

        if (existing === undefined) {
          const [inserted] = await transaction
            .insert(squadGroupInvitation)
            .values({
              invitedByUserId: appUserIdToString(ownerUserId),
              invitedUserId: appUserIdToString(invitedUserId),
              squadGroupId: squadGroupIdToNumber(groupId),
              status: "pending",
            })
            .returning({ id: squadGroupInvitation.id });
          if (inserted === undefined) {
            return err({
              _tag: "SquadBuilderPersistenceUnavailable",
              cause: new Error("Failed to insert squad group invitation"),
              operation: "upsertSquadGroupEditorInvite",
            });
          }
          return ok(inserted.id as SquadGroupInvitationId);
        }

        const status = parseSquadGroupInvitationStatus(existing.status);
        if (isError(status)) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable" as const,
            cause: new Error(
              `Unexpected squad group invitation status: ${existing.status}`
            ),
            operation: "upsertSquadGroupEditorInvite",
          });
        }

        if (!canTransitionSquadGroupInvitation(status.value, "pending")) {
          return err({
            _tag: "SquadGroupInvitationTransitionNotAllowed" as const,
            attempted: "pending",
            currentStatus: status.value,
          });
        }

        await transaction
          .update(squadGroupInvitation)
          .set({
            invitedByUserId: appUserIdToString(ownerUserId),
            status: "pending",
            updatedAt: now,
          })
          .where(eq(squadGroupInvitation.id, existing.id));
        return ok(existing.id as SquadGroupInvitationId);
      });

      if (isError(inviteId)) {
        return err(inviteId.error);
      }

      const summary = await this.loadSquadGroupInvitationSummary(
        inviteId.value
      );
      if (isError(summary)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error("Squad group invitation vanished after upsert"),
          operation: "upsertSquadGroupEditorInvite",
        });
      }
      return ok(summary.value);
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "upsertSquadGroupEditorInvite",
      });
    }
  }

  /** List pending squad group invitations received by the actor. */
  async listIncomingSquadGroupInvites({
    actorUserId,
  }: {
    readonly actorUserId: AppUserId;
  }): Promise<
    Result<
      readonly SquadGroupInvitationSummary[],
      SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const rows = await this.database
        .select({ id: squadGroupInvitation.id })
        .from(squadGroupInvitation)
        .where(
          and(
            eq(
              squadGroupInvitation.invitedUserId,
              appUserIdToString(actorUserId)
            ),
            eq(squadGroupInvitation.status, "pending")
          )
        )
        .orderBy(desc(squadGroupInvitation.createdAt));

      const summaries = await Promise.all(
        rows.map((row) =>
          this.loadSquadGroupInvitationSummary(row.id as SquadGroupInvitationId)
        )
      );

      const values: SquadGroupInvitationSummary[] = [];
      for (const summary of summaries) {
        if (isError(summary)) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable",
            cause: new Error("Squad group invitation summary missing"),
            operation: "listIncomingSquadGroupInvites",
          });
        }
        values.push(summary.value);
      }

      return ok(values);
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "listIncomingSquadGroupInvites",
      });
    }
  }

  /** Count pending squad group invitations received by the actor. */
  async getPendingSquadGroupInviteCount({
    actorUserId,
  }: {
    readonly actorUserId: AppUserId;
  }): Promise<Result<number, SquadBuilderPersistenceUnavailable>> {
    try {
      const [row] = await this.database
        .select({ inviteCount: count() })
        .from(squadGroupInvitation)
        .where(
          and(
            eq(
              squadGroupInvitation.invitedUserId,
              appUserIdToString(actorUserId)
            ),
            eq(squadGroupInvitation.status, "pending")
          )
        );
      return ok(row?.inviteCount ?? 0);
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "getPendingSquadGroupInviteCount",
      });
    }
  }

  /** Accept or decline a squad group editor invite as the invited user. */
  async respondToSquadGroupInvite({
    invitationId,
    invitedUserId,
    now,
    response,
  }: RespondToSquadGroupInviteStoreInput): Promise<
    Result<
      SquadGroupInvitationSummary,
      | { readonly _tag: "SquadGroupInvitationNotFound" }
      | { readonly _tag: "ActorIsNotSquadGroupInviteRecipient" }
      | {
          readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
          readonly currentStatus: SquadGroupInvitationStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const update = await this.database.transaction<
        Result<
          void,
          | { readonly _tag: "SquadGroupInvitationNotFound" }
          | { readonly _tag: "ActorIsNotSquadGroupInviteRecipient" }
          | {
              readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
              readonly currentStatus: SquadGroupInvitationStatus;
              readonly attempted: string;
            }
          | SquadBuilderPersistenceUnavailable
        >
      >(async (transaction) => {
        const [existing] = await transaction
          .select({
            invitedUserId: squadGroupInvitation.invitedUserId,
            status: squadGroupInvitation.status,
          })
          .from(squadGroupInvitation)
          .where(
            eq(
              squadGroupInvitation.id,
              squadGroupInvitationIdToNumber(invitationId)
            )
          )
          .limit(1);

        if (existing === undefined) {
          return err({ _tag: "SquadGroupInvitationNotFound" as const });
        }
        if (existing.invitedUserId !== appUserIdToString(invitedUserId)) {
          return err({ _tag: "ActorIsNotSquadGroupInviteRecipient" as const });
        }
        const status = parseSquadGroupInvitationStatus(existing.status);
        if (isError(status)) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable" as const,
            cause: new Error(
              `Unexpected squad group invitation status: ${existing.status}`
            ),
            operation: "respondToSquadGroupInvite",
          });
        }
        const nextStatus = response === "accept" ? "accepted" : "declined";
        if (!canTransitionSquadGroupInvitation(status.value, nextStatus)) {
          return err({
            _tag: "SquadGroupInvitationTransitionNotAllowed" as const,
            attempted: nextStatus,
            currentStatus: status.value,
          });
        }
        await transaction
          .update(squadGroupInvitation)
          .set({ status: nextStatus, updatedAt: now })
          .where(
            eq(
              squadGroupInvitation.id,
              squadGroupInvitationIdToNumber(invitationId)
            )
          );
        return ok();
      });

      if (isError(update)) {
        return err(update.error);
      }

      return this.loadSquadGroupInvitationSummary(invitationId);
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "respondToSquadGroupInvite",
      });
    }
  }

  /** Revoke pending or accepted squad group editor access as the owner. */
  async revokeSquadGroupEditor({
    invitationId,
    now,
    ownerUserId,
  }: RevokeSquadGroupEditorStoreInput): Promise<
    Result<
      SquadGroupInvitationSummary,
      | { readonly _tag: "SquadGroupInvitationNotFound" }
      | ActorDoesNotOwnSquadGroup
      | {
          readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
          readonly currentStatus: SquadGroupInvitationStatus;
          readonly attempted: string;
        }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const revoke = await this.database.transaction<
        Result<
          void,
          | { readonly _tag: "SquadGroupInvitationNotFound" }
          | ActorDoesNotOwnSquadGroup
          | {
              readonly _tag: "SquadGroupInvitationTransitionNotAllowed";
              readonly currentStatus: SquadGroupInvitationStatus;
              readonly attempted: string;
            }
          | SquadBuilderPersistenceUnavailable
        >
      >(async (transaction) => {
        const [existing] = await transaction
          .select({
            ownerUserId: squadGroup.ownerUserId,
            status: squadGroupInvitation.status,
          })
          .from(squadGroupInvitation)
          .innerJoin(
            squadGroup,
            eq(squadGroup.id, squadGroupInvitation.squadGroupId)
          )
          .where(
            eq(
              squadGroupInvitation.id,
              squadGroupInvitationIdToNumber(invitationId)
            )
          )
          .limit(1);
        if (existing === undefined) {
          return err({ _tag: "SquadGroupInvitationNotFound" as const });
        }
        if (existing.ownerUserId !== appUserIdToString(ownerUserId)) {
          return err({ _tag: "ActorDoesNotOwnSquadGroup" as const });
        }
        const status = parseSquadGroupInvitationStatus(existing.status);
        if (isError(status)) {
          return err({
            _tag: "SquadBuilderPersistenceUnavailable" as const,
            cause: new Error(
              `Unexpected squad group invitation status: ${existing.status}`
            ),
            operation: "revokeSquadGroupEditor",
          });
        }
        if (!canTransitionSquadGroupInvitation(status.value, "revoked")) {
          return err({
            _tag: "SquadGroupInvitationTransitionNotAllowed" as const,
            attempted: "revoked",
            currentStatus: status.value,
          });
        }
        await transaction
          .update(squadGroupInvitation)
          .set({ status: "revoked", updatedAt: now })
          .where(
            eq(
              squadGroupInvitation.id,
              squadGroupInvitationIdToNumber(invitationId)
            )
          );
        return ok();
      });

      if (isError(revoke)) {
        return err(revoke.error);
      }

      return this.loadSquadGroupInvitationSummary(invitationId);
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "revokeSquadGroupEditor",
      });
    }
  }

  /** List squad groups shared with the actor as accepted editor. */
  async listSharedSquadGroups({
    actorUserId,
    filters,
  }: {
    readonly actorUserId: AppUserId;
    readonly filters: SquadGroupListFilters;
  }): Promise<
    Result<
      readonly SharedSquadGroupSummary[],
      SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const filterPredicates =
        this.buildSquadGroupListFilterPredicates(filters);

      const rows = await this.database
        .select({
          characterCount: sql<number>`count(distinct ${squadCharacter.id})::int`,
          groupId: squadGroup.id,
          name: squadGroup.name,
          ownerId: user.id,
          ownerImage: user.image,
          ownerName: user.name,
          squadCount: sql<number>`count(distinct ${squad.id})::int`,
          updatedAt: squadGroup.updatedAt,
        })
        .from(squadGroupInvitation)
        .innerJoin(
          squadGroup,
          eq(squadGroup.id, squadGroupInvitation.squadGroupId)
        )
        .innerJoin(user, eq(user.id, squadGroup.ownerUserId))
        .leftJoin(squad, eq(squad.squadGroupId, squadGroup.id))
        .leftJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
        .where(
          and(
            eq(
              squadGroupInvitation.invitedUserId,
              appUserIdToString(actorUserId)
            ),
            eq(squadGroupInvitation.status, "accepted"),
            ...filterPredicates
          )
        )
        .groupBy(squadGroup.id, user.id)
        .orderBy(desc(squadGroup.updatedAt), desc(squadGroup.id));

      return ok(
        rows.map((row) => {
          const groupId = row.groupId as SquadGroupId;
          const name = row.name as SquadGroupName;
          const ownerUserId = row.ownerId as AppUserId;
          return {
            characterCount: row.characterCount ?? 0,
            groupId,
            name,
            ownerUserId,
            ownerUserImage: row.ownerImage,
            ownerUserName: row.ownerName,
            squadCount: row.squadCount ?? 0,
            updatedAt: row.updatedAt,
          };
        })
      );
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "listSharedSquadGroups",
      });
    }
  }

  /** List pending and accepted editor grants for an owned squad group. */
  async listSquadGroupEditorGrants({
    actorUserId,
    groupId,
  }: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Promise<
    Result<
      readonly SquadGroupEditorGrantSummary[],
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  > {
    const owner = await this.authorizeSquadGroupOwner({ actorUserId, groupId });
    if (isError(owner)) {
      return err(owner.error);
    }

    try {
      const rows = await this.database
        .select({
          createdAt: squadGroupInvitation.createdAt,
          image: user.image,
          invitationId: squadGroupInvitation.id,
          name: user.name,
          status: squadGroupInvitation.status,
          updatedAt: squadGroupInvitation.updatedAt,
          userId: user.id,
        })
        .from(squadGroupInvitation)
        .innerJoin(user, eq(user.id, squadGroupInvitation.invitedUserId))
        .where(
          and(
            eq(
              squadGroupInvitation.squadGroupId,
              squadGroupIdToNumber(groupId)
            ),
            inArray(squadGroupInvitation.status, ["pending", "accepted"])
          )
        )
        .orderBy(desc(squadGroupInvitation.createdAt));

      return ok(
        rows.map((row) => {
          const status = parseSquadGroupInvitationStatus(row.status);
          if (isError(status)) {
            throw status.error;
          }
          const userId = parseAppUserId(row.userId);
          if (isError(userId)) {
            throw userId.error;
          }
          // SAFETY: The WHERE clause constrains status to ["pending", "accepted"].
          const grantStatus: Extract<
            SquadGroupInvitationStatus,
            "pending" | "accepted"
          > =
            status.value === "pending" || status.value === "accepted"
              ? status.value
              : (() => {
                  throw new Error(
                    `Unexpected status after WHERE filter: ${status.value}`
                  );
                })();
          return {
            createdAt: row.createdAt,
            invitationId: row.invitationId as SquadGroupInvitationId,
            status: grantStatus,
            updatedAt: row.updatedAt,
            userId: userId.value,
            userImage: row.image,
            userName: row.name,
          };
        })
      );
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "listSquadGroupEditorGrants",
      });
    }
  }

  /** Atomically replace character placements inside existing squads. */
  async saveSharedSquadGroupCharacters({
    actorUserId,
    groupId,
    now,
    snapshot,
  }: SaveSharedSquadGroupCharactersStoreInput): Promise<
    Result<SquadGroupDetail, SharedSquadGroupSaveError>
  > {
    try {
      const groupIdNum = squadGroupIdToNumber(groupId);
      const save = await this.database.transaction<
        Result<void, SharedSquadGroupSaveError>
      >(async (transaction) => {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`squad-group:${groupIdNum}`}))`
        );

        const [group] = await transaction
          .select({ ownerUserId: squadGroup.ownerUserId })
          .from(squadGroup)
          .where(eq(squadGroup.id, groupIdNum))
          .limit(1);
        if (group === undefined) {
          return err({ _tag: "SquadGroupNotFound" as const });
        }
        if (group.ownerUserId !== appUserIdToString(actorUserId)) {
          const [invite] = await transaction
            .select({ id: squadGroupInvitation.id })
            .from(squadGroupInvitation)
            .where(
              and(
                eq(squadGroupInvitation.squadGroupId, groupIdNum),
                eq(
                  squadGroupInvitation.invitedUserId,
                  appUserIdToString(actorUserId)
                ),
                eq(squadGroupInvitation.status, "accepted")
              )
            )
            .limit(1);
          if (invite === undefined) {
            return err({ _tag: "ActorCannotEditSquadGroup" as const });
          }
        }

        const existingSquads = await transaction
          .select({ id: squad.id })
          .from(squad)
          .where(eq(squad.squadGroupId, groupIdNum));
        const existingSquadIds = new Set(existingSquads.map((row) => row.id));
        if (existingSquadIds.size !== snapshot.squads.length) {
          return err({ _tag: "EditorCannotChangeSquadStructure" as const });
        }
        for (const submitted of snapshot.squads) {
          if (!existingSquadIds.has(submitted.squadId)) {
            return err({
              _tag: "SquadNotInGroup" as const,
              squadId: submitted.squadId,
            });
          }
        }

        await transaction
          .delete(squadCharacter)
          .where(eq(squadCharacter.squadGroupId, groupIdNum));
        const characterIds = snapshot.squads.flatMap((item) =>
          item.characters.map((character) => character.characterId)
        );
        const charactersById = new Map<
          number,
          { readonly accountId: number }
        >();
        if (characterIds.length > 0) {
          const characterRows = await transaction
            .select({
              accountId: margonemCharacter.accountId,
              id: margonemCharacter.id,
            })
            .from(margonemCharacter)
            .where(inArray(margonemCharacter.id, characterIds));
          for (const character of characterRows) {
            charactersById.set(character.id, {
              accountId: character.accountId,
            });
          }
        }
        const placements = [];
        for (const submitted of snapshot.squads) {
          for (const character of submitted.characters) {
            const stored = charactersById.get(character.characterId);
            if (stored === undefined) {
              return err({
                _tag: "SquadCharacterNotAccessible" as const,
                characterId: character.characterId,
              });
            }
            placements.push({
              accountId: stored.accountId,
              characterId: character.characterId,
              position: character.position,
              squadGroupId: groupIdNum,
              squadId: submitted.squadId,
            });
          }
        }
        if (placements.length > 0) {
          await transaction.insert(squadCharacter).values(placements);
        }
        await transaction
          .update(squadGroup)
          .set({ updatedAt: now })
          .where(eq(squadGroup.id, groupIdNum));
        return ok();
      });

      if (isError(save)) {
        return err(save.error);
      }

      return this.loadSquadGroupDetailForActor(actorUserId, groupId);
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "saveSharedSquadGroupCharacters",
      });
    }
  }

  /** Create an empty private squad group owned by the actor. */
  async createSquadGroup({
    actorUserId,
    name,
  }: CreateSquadGroupStoreInput): Promise<
    Result<SquadGroupSummary, SquadBuilderPersistenceUnavailable>
  > {
    try {
      const [created] = await this.database
        .insert(squadGroup)
        .values({
          name: squadGroupNameToString(name),
          ownerUserId: appUserIdToString(actorUserId),
          visibility: "private",
        })
        .returning({
          id: squadGroup.id,
          updatedAt: squadGroup.updatedAt,
        });

      if (created === undefined) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error("Failed to insert squad group"),
          operation: "createSquadGroup",
        });
      }

      return ok({
        characterCount: 0,
        groupId: created.id as SquadGroupId,
        name,
        squadCount: 0,
        updatedAt: created.updatedAt,
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "createSquadGroup",
      });
    }
  }

  /** List squad groups owned by the actor. */
  async listMySquadGroups({
    actorUserId,
  }: ListMySquadGroupsInput): Promise<
    Result<readonly SquadGroupSummary[], SquadBuilderPersistenceUnavailable>
  > {
    try {
      const rows = await this.database
        .select({
          characterCount: sql<number>`count(distinct ${squadCharacter.id})::int`,
          groupId: squadGroup.id,
          name: squadGroup.name,
          squadCount: sql<number>`count(distinct ${squad.id})::int`,
          updatedAt: squadGroup.updatedAt,
        })
        .from(squadGroup)
        .leftJoin(squad, eq(squad.squadGroupId, squadGroup.id))
        .leftJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
        .where(eq(squadGroup.ownerUserId, appUserIdToString(actorUserId)))
        .groupBy(squadGroup.id)
        .orderBy(desc(squadGroup.updatedAt), desc(squadGroup.id));

      return ok(
        rows.map((row) => ({
          characterCount: row.characterCount ?? 0,
          groupId: row.groupId as SquadGroupId,
          name: row.name as SquadGroupName,
          squadCount: row.squadCount ?? 0,
          updatedAt: row.updatedAt,
        }))
      );
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "listMySquadGroups",
      });
    }
  }

  /** Change squad group visibility as the owner. */
  async setSquadGroupVisibility({
    actorUserId,
    groupId,
    now,
    visibility,
  }: SetSquadGroupVisibilityStoreInput): Promise<
    Result<
      SquadGroupVisibilityChange,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const groupIdNum = squadGroupIdToNumber(groupId);
      const [existing] = await this.database
        .select({
          ownerUserId: squadGroup.ownerUserId,
          updatedAt: squadGroup.updatedAt,
          visibility: squadGroup.visibility,
        })
        .from(squadGroup)
        .where(eq(squadGroup.id, groupIdNum))
        .limit(1);

      if (existing === undefined) {
        return err({ _tag: "SquadGroupNotFound" });
      }

      if (existing.ownerUserId !== appUserIdToString(actorUserId)) {
        return err({ _tag: "ActorDoesNotOwnSquadGroup" });
      }

      if (existing.visibility === visibility) {
        return ok({ groupId, updatedAt: existing.updatedAt, visibility });
      }

      const [updated] = await this.database
        .update(squadGroup)
        .set({ updatedAt: now, visibility })
        .where(eq(squadGroup.id, groupIdNum))
        .returning({ updatedAt: squadGroup.updatedAt });

      if (updated === undefined) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error("Failed to update squad group visibility"),
          operation: "setSquadGroupVisibility",
        });
      }

      return ok({ groupId, updatedAt: updated.updatedAt, visibility });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "setSquadGroupVisibility",
      });
    }
  }

  /** List globally visible squad groups. */
  async listGlobalSquadGroups({
    filters,
    limit,
  }: ListGlobalSquadGroupsInput): Promise<
    Result<
      readonly GlobalSquadGroupSummary[],
      SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const filterPredicates =
        this.buildSquadGroupListFilterPredicates(filters);

      const rows = await this.database
        .select({
          characterCount: sql<number>`count(distinct ${squadCharacter.id})::int`,
          groupId: squadGroup.id,
          name: squadGroup.name,
          ownerId: user.id,
          ownerImage: user.image,
          ownerName: user.name,
          squadCount: sql<number>`count(distinct ${squad.id})::int`,
          updatedAt: squadGroup.updatedAt,
        })
        .from(squadGroup)
        .innerJoin(user, eq(user.id, squadGroup.ownerUserId))
        .leftJoin(squad, eq(squad.squadGroupId, squadGroup.id))
        .leftJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
        .where(and(eq(squadGroup.visibility, "global"), ...filterPredicates))
        .groupBy(squadGroup.id, user.id)
        .orderBy(desc(squadGroup.updatedAt), desc(squadGroup.id))
        .limit(limit);

      return ok(
        rows.map((row) => ({
          characterCount: row.characterCount ?? 0,
          groupId: row.groupId as SquadGroupId,
          name: row.name as SquadGroupName,
          ownerUserId: row.ownerId as AppUserId,
          ownerUserImage: row.ownerImage,
          ownerUserName: row.ownerName,
          squadCount: row.squadCount ?? 0,
          updatedAt: row.updatedAt,
        }))
      );
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "listGlobalSquadGroups",
      });
    }
  }

  /** Load a squad group accessible to the actor. */
  async getSquadGroupDetail({
    actorUserId,
    groupId,
  }: GetSquadGroupDetailInput): Promise<
    Result<
      SquadGroupDetail,
      | SquadGroupNotFound
      | ActorCannotViewSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      return await this.loadSquadGroupDetailForActor(actorUserId, groupId);
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "getSquadGroupDetail",
      });
    }
  }

  /** List Jaruna characters from accounts accessible to a squad group owner. */
  async listAvailableCharactersForOwner({
    ownerUserId,
  }: ListAvailableCharactersForOwnerInput): Promise<
    Result<
      readonly AvailableSquadCharacter[],
      SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const owner = appUserIdToString(ownerUserId);
      const rows = await this.database
        .select({
          accountDisplayName: margonemAccount.displayName,
          accountId: margonemAccount.id,
          accountOwnerUserId: margonemAccount.ownerUserId,
          accountOwnerUserImage: user.image,
          accountOwnerUserName: user.name,
          avatarUrl: margonemCharacter.avatarUrl,
          characterId: margonemCharacter.id,
          level: margonemCharacter.level,
          margonemCharacterId: margonemCharacter.characterId,
          name: margonemCharacter.name,
          profession: margonemCharacter.profession,
          world: margonemCharacter.world,
        })
        .from(margonemCharacter)
        .innerJoin(
          margonemAccount,
          eq(margonemAccount.id, margonemCharacter.accountId)
        )
        .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
        .leftJoin(
          margonemAccountAccess,
          and(
            eq(margonemAccountAccess.accountId, margonemAccount.id),
            eq(margonemAccountAccess.userId, owner),
            eq(margonemAccountAccess.status, "accepted")
          )
        )
        .where(
          and(
            eq(margonemCharacter.world, "jaruna"),
            sql`(${margonemAccount.ownerUserId} = ${owner} or ${margonemAccountAccess.id} is not null)`
          )
        )
        .orderBy(
          asc(margonemAccount.displayName),
          asc(margonemCharacter.level)
        );

      return ok(
        rows.map((row) => {
          const accountDisplayName = parseAccountDisplayName(
            row.accountDisplayName
          );
          if (isError(accountDisplayName)) {
            throw accountDisplayName.error;
          }
          const accountOwnerUserId = parseAppUserId(row.accountOwnerUserId);
          if (isError(accountOwnerUserId)) {
            throw accountOwnerUserId.error;
          }
          const level = parsePositiveLevel(row.level);
          if (isError(level)) {
            throw level.error;
          }
          const profession = parseMargonemProfession(row.profession);
          if (isError(profession)) {
            throw profession.error;
          }
          const world = parseMargonemWorld(row.world);
          if (isError(world)) {
            throw world.error;
          }
          const margonemCharacterId = parseMargonemCharacterId(
            row.margonemCharacterId
          );
          if (isError(margonemCharacterId)) {
            throw margonemCharacterId.error;
          }
          return {
            accountDisplayName: accountDisplayName.value,
            accountId: row.accountId as MargonemAccountId,
            accountOwnerUserId: accountOwnerUserId.value,
            accountOwnerUserImage: row.accountOwnerUserImage,
            accountOwnerUserName: row.accountOwnerUserName,
            avatarUrl: row.avatarUrl,
            characterId: row.characterId,
            level: level.value,
            margonemCharacterId: margonemCharacterId.value,
            name: row.name,
            profession: profession.value,
            world: world.value,
          };
        })
      );
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "listAvailableCharactersForOwner",
      });
    }
  }

  /** Atomically replace squads and placements for a squad group snapshot. */
  async saveSquadGroupSnapshot({
    actorUserId,
    availableCharacters,
    now,
    snapshot,
  }: SaveSquadGroupSnapshotStoreInput): Promise<
    Result<
      SquadGroupDetail,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const groupIdNum = squadGroupIdToNumber(snapshot.groupId);
      const availableByCharacterId = new Map<number, AvailableSquadCharacter>();
      for (const character of availableCharacters) {
        availableByCharacterId.set(character.characterId, character);
      }

      const saveResult = await this.database.transaction<
        Result<
          void,
          | SquadGroupNotFound
          | ActorDoesNotOwnSquadGroup
          | SquadBuilderPersistenceUnavailable
        >
      >(async (transaction) => {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`squad-group:${groupIdNum}`}))`
        );

        const [group] = await transaction
          .select({ ownerUserId: squadGroup.ownerUserId })
          .from(squadGroup)
          .where(eq(squadGroup.id, groupIdNum))
          .limit(1);

        if (group === undefined) {
          return err({ _tag: "SquadGroupNotFound" });
        }

        if (group.ownerUserId !== appUserIdToString(actorUserId)) {
          return err({ _tag: "ActorDoesNotOwnSquadGroup" });
        }

        await transaction
          .update(squadGroup)
          .set({ name: squadGroupNameToString(snapshot.name), updatedAt: now })
          .where(eq(squadGroup.id, groupIdNum));

        await transaction
          .delete(squad)
          .where(eq(squad.squadGroupId, groupIdNum));

        const insertedResults = await Promise.all(
          snapshot.squads.map(async (squadSnapshot) => {
            const [insertedSquad] = await transaction
              .insert(squad)
              .values({
                name: squadNameToString(squadSnapshot.name),
                position: squadSnapshot.position,
                squadGroupId: groupIdNum,
                updatedAt: now,
              })
              .returning({ id: squad.id });

            if (insertedSquad === undefined) {
              const failure: SquadBuilderPersistenceUnavailable = {
                _tag: "SquadBuilderPersistenceUnavailable",
                cause: new Error("Failed to insert squad"),
                operation: "saveSquadGroupSnapshot",
              };
              return err(failure);
            }

            if (squadSnapshot.characters.length === 0) {
              return ok();
            }

            const placementRows = [];
            for (const placement of squadSnapshot.characters) {
              const character = availableByCharacterId.get(
                placement.characterId
              );

              if (character === undefined) {
                const failure: SquadBuilderPersistenceUnavailable = {
                  _tag: "SquadBuilderPersistenceUnavailable",
                  cause: new Error("Validated character was not available"),
                  operation: "saveSquadGroupSnapshot",
                };
                return err(failure);
              }

              placementRows.push({
                accountId: margonemAccountIdToNumber(character.accountId),
                characterId: placement.characterId,
                position: placement.position,
                squadGroupId: groupIdNum,
                squadId: insertedSquad.id,
              });
            }

            await transaction.insert(squadCharacter).values(placementRows);
            return ok();
          })
        );

        for (const insertedResult of insertedResults) {
          if (isError(insertedResult)) {
            return err(insertedResult.error);
          }
        }

        return ok();
      });

      if (isError(saveResult)) {
        return err(saveResult.error);
      }

      const detail = await this.loadSquadGroupDetailForActor(
        actorUserId,
        snapshot.groupId
      );

      if (isError(detail)) {
        if (detail.error._tag === "ActorCannotViewSquadGroup") {
          return err({ _tag: "ActorDoesNotOwnSquadGroup" });
        }
        return err(detail.error);
      }

      return ok(detail.value);
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "saveSquadGroupSnapshot",
      });
    }
  }

  private buildSquadGroupListFilterPredicates(
    filters: SquadGroupListFilters
  ): SQL[] {
    const predicates: SQL[] = [];

    if (filters.nameQuery !== undefined) {
      const escapedQuery = escapeLikePattern(
        squadGroupNameQueryToString(filters.nameQuery)
      );
      const namePredicate = or(
        ilike(squadGroup.name, `%${escapedQuery}%`),
        exists(
          this.database
            .select({ one: sql`1` })
            .from(squad)
            .where(
              and(
                eq(squad.squadGroupId, squadGroup.id),
                ilike(squad.name, `%${escapedQuery}%`)
              )
            )
        )
      );

      if (namePredicate !== undefined) {
        predicates.push(namePredicate);
      }
    }

    if (filters.levelRange._tag === "BoundedLevelRange") {
      const levelPredicates: SQL[] = [eq(squad.squadGroupId, squadGroup.id)];

      if (filters.levelRange.minLevel !== undefined) {
        levelPredicates.push(
          gte(
            margonemCharacter.level,
            squadGroupLevelBoundToNumber(filters.levelRange.minLevel)
          )
        );
      }

      if (filters.levelRange.maxLevel !== undefined) {
        levelPredicates.push(
          lte(
            margonemCharacter.level,
            squadGroupLevelBoundToNumber(filters.levelRange.maxLevel)
          )
        );
      }

      predicates.push(
        exists(
          this.database
            .select({ one: sql`1` })
            .from(squad)
            .innerJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
            .innerJoin(
              margonemCharacter,
              eq(margonemCharacter.id, squadCharacter.characterId)
            )
            .where(and(...levelPredicates))
        )
      );
    }

    return predicates;
  }

  /** Load a single account access invite summary with owner and account joins. */
  private async loadAccountAccessInviteSummary(
    accessId: MargonemAccountAccessId
  ): Promise<
    Result<
      AccountAccessInviteSummary,
      | { readonly _tag: "AccountAccessInviteNotFound" }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const [row] = await this.database
        .select({
          accessId: margonemAccountAccess.id,
          accountDisplayName: margonemAccount.displayName,
          accountId: margonemAccountAccess.accountId,
          createdAt: margonemAccountAccess.createdAt,
          invitedUserId: margonemAccountAccess.userId,
          ownerId: user.id,
          ownerImage: user.image,
          ownerName: user.name,
          profileId: margonemAccount.profileId,
          status: margonemAccountAccess.status,
          updatedAt: margonemAccountAccess.updatedAt,
        })
        .from(margonemAccountAccess)
        .innerJoin(
          margonemAccount,
          eq(margonemAccount.id, margonemAccountAccess.accountId)
        )
        .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
        .where(
          eq(
            margonemAccountAccess.id,
            margonemAccountAccessIdToNumber(accessId)
          )
        )
        .limit(1);

      if (row === undefined) {
        return err({ _tag: "AccountAccessInviteNotFound" });
      }

      const status = parseAccountAccessStatus(row.status);

      if (isError(status)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(`Unexpected account access status: ${row.status}`),
          operation: "loadAccountAccessInviteSummary",
        });
      }

      const accountDisplayName = parseAccountDisplayName(
        row.accountDisplayName
      );
      if (isError(accountDisplayName)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(
            `Unexpected account display name: ${row.accountDisplayName}`
          ),
          operation: "loadAccountAccessInviteSummary",
        });
      }

      const profileId = parseMargonemProfileId(row.profileId);
      if (isError(profileId)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(`Unexpected account profile id: ${row.profileId}`),
          operation: "loadAccountAccessInviteSummary",
        });
      }

      const invitedUserId = parseAppUserId(row.invitedUserId);
      if (isError(invitedUserId)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(`Unexpected invited user id: ${row.invitedUserId}`),
          operation: "loadAccountAccessInviteSummary",
        });
      }

      const ownerUserId = parseAppUserId(row.ownerId);
      if (isError(ownerUserId)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(`Unexpected owner user id: ${row.ownerId}`),
          operation: "loadAccountAccessInviteSummary",
        });
      }

      return ok({
        accessId: row.accessId as MargonemAccountAccessId,
        accountDisplayName: accountDisplayName.value,
        accountId: row.accountId as MargonemAccountId,
        createdAt: row.createdAt,
        generatedProfileUrl: toMargonemProfileUrl(profileId.value),
        invitedUserId: invitedUserId.value,
        ownerUserId: ownerUserId.value,
        ownerUserImage: row.ownerImage,
        ownerUserName: row.ownerName,
        status: status.value,
        updatedAt: row.updatedAt,
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "loadAccountAccessInviteSummary",
      });
    }
  }

  private async resolveSquadGroupAccess({
    actorUserId,
    groupId,
  }: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Promise<
    Result<
      SquadGroupAccess,
      | SquadGroupNotFound
      | ActorCannotEditSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const groupIdNum = squadGroupIdToNumber(groupId);
      const actor = appUserIdToString(actorUserId);
      const [group] = await this.database
        .select({
          ownerUserId: squadGroup.ownerUserId,
          visibility: squadGroup.visibility,
        })
        .from(squadGroup)
        .where(eq(squadGroup.id, groupIdNum))
        .limit(1);

      if (group === undefined) {
        return err({ _tag: "SquadGroupNotFound" });
      }

      if (group.ownerUserId === actor) {
        return ok({
          _tag: "SquadGroupOwnerAccess",
          groupId,
          ownerUserId: actorUserId,
          role: "owner",
        });
      }

      const [invite] = await this.database
        .select({ id: squadGroupInvitation.id })
        .from(squadGroupInvitation)
        .where(
          and(
            eq(squadGroupInvitation.squadGroupId, groupIdNum),
            eq(squadGroupInvitation.invitedUserId, actor),
            eq(squadGroupInvitation.status, "accepted")
          )
        )
        .limit(1);

      if (invite === undefined) {
        return err({ _tag: "ActorCannotEditSquadGroup" });
      }

      return ok({
        _tag: "SquadGroupEditorAccess",
        editorUserId: actorUserId,
        groupId,
        invitationId: invite.id as SquadGroupInvitationId,
        ownerUserId: group.ownerUserId as AppUserId,
        role: "editor",
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "resolveSquadGroupAccess",
      });
    }
  }

  private async loadSquadGroupInvitationSummary(
    invitationId: SquadGroupInvitationId
  ): Promise<
    Result<
      SquadGroupInvitationSummary,
      | { readonly _tag: "SquadGroupInvitationNotFound" }
      | SquadBuilderPersistenceUnavailable
    >
  > {
    try {
      const [row] = await this.database
        .select({
          createdAt: squadGroupInvitation.createdAt,
          invitationId: squadGroupInvitation.id,
          ownerId: user.id,
          ownerImage: user.image,
          ownerName: user.name,
          squadGroupId: squadGroup.id,
          squadGroupName: squadGroup.name,
          status: squadGroupInvitation.status,
          updatedAt: squadGroupInvitation.updatedAt,
        })
        .from(squadGroupInvitation)
        .innerJoin(
          squadGroup,
          eq(squadGroup.id, squadGroupInvitation.squadGroupId)
        )
        .innerJoin(user, eq(user.id, squadGroup.ownerUserId))
        .where(
          eq(
            squadGroupInvitation.id,
            squadGroupInvitationIdToNumber(invitationId)
          )
        )
        .limit(1);

      if (row === undefined) {
        return err({ _tag: "SquadGroupInvitationNotFound" });
      }

      const status = parseSquadGroupInvitationStatus(row.status);
      if (isError(status)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(
            `Unexpected squad group invitation status: ${row.status}`
          ),
          operation: "loadSquadGroupInvitationSummary",
        });
      }

      const ownerUserId = parseAppUserId(row.ownerId);
      if (isError(ownerUserId)) {
        return err({
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(`Unexpected owner user id: ${row.ownerId}`),
          operation: "loadSquadGroupInvitationSummary",
        });
      }

      return ok({
        createdAt: row.createdAt,
        invitationId: row.invitationId as SquadGroupInvitationId,
        ownerUserId: ownerUserId.value,
        ownerUserImage: row.ownerImage,
        ownerUserName: row.ownerName,
        squadGroupId: row.squadGroupId as SquadGroupId,
        squadGroupName: row.squadGroupName as SquadGroupName,
        status: status.value,
        updatedAt: row.updatedAt,
      });
    } catch (error: unknown) {
      return err({
        _tag: "SquadBuilderPersistenceUnavailable",
        cause: error,
        operation: "loadSquadGroupInvitationSummary",
      });
    }
  }

  /** Load a squad group detail and enforce owner, accepted-editor, or global viewer access. */
  private async loadSquadGroupDetailForActor(
    actorUserId: AppUserId,
    groupId: SquadGroupId
  ): Promise<
    Result<
      SquadGroupDetail,
      | SquadGroupNotFound
      | ActorCannotViewSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  > {
    const access = await this.authorizeSquadGroupViewer({
      actorUserId,
      groupId,
    });

    if (isError(access)) {
      return err(access.error);
    }

    const groupIdNum = squadGroupIdToNumber(groupId);
    const [group] = await this.database
      .select({
        name: squadGroup.name,
        ownerUserId: squadGroup.ownerUserId,
        updatedAt: squadGroup.updatedAt,
        visibility: squadGroup.visibility,
      })
      .from(squadGroup)
      .where(eq(squadGroup.id, groupIdNum))
      .limit(1);

    if (group === undefined) {
      return err({ _tag: "SquadGroupNotFound" });
    }

    const squadRows = await this.database
      .select({
        id: squad.id,
        name: squad.name,
        position: squad.position,
      })
      .from(squad)
      .where(eq(squad.squadGroupId, groupIdNum))
      .orderBy(asc(squad.position), asc(squad.id));

    const placementRows = await this.database
      .select({
        accountDisplayName: margonemAccount.displayName,
        accountId: margonemAccount.id,
        accountOwnerUserImage: user.image,
        accountOwnerUserName: user.name,
        avatarUrl: margonemCharacter.avatarUrl,
        characterId: margonemCharacter.id,
        level: margonemCharacter.level,
        margonemCharacterId: margonemCharacter.characterId,
        name: margonemCharacter.name,
        placementId: squadCharacter.id,
        position: squadCharacter.position,
        profession: margonemCharacter.profession,
        squadId: squadCharacter.squadId,
      })
      .from(squadCharacter)
      .innerJoin(
        margonemCharacter,
        eq(margonemCharacter.id, squadCharacter.characterId)
      )
      .innerJoin(
        margonemAccount,
        eq(margonemAccount.id, margonemCharacter.accountId)
      )
      .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
      .where(eq(squadCharacter.squadGroupId, groupIdNum))
      .orderBy(asc(squadCharacter.position), asc(squadCharacter.id));

    const charactersBySquadId = new Map<number, SquadGroupCharacter[]>();
    for (const placement of placementRows) {
      const current = charactersBySquadId.get(placement.squadId) ?? [];
      const accountDisplayName = parseAccountDisplayName(
        placement.accountDisplayName
      );
      if (isError(accountDisplayName)) {
        throw accountDisplayName.error;
      }
      const profession = parseMargonemProfession(placement.profession);
      if (isError(profession)) {
        throw profession.error;
      }
      const margonemCharacterId = parseMargonemCharacterId(
        placement.margonemCharacterId
      );
      if (isError(margonemCharacterId)) {
        throw margonemCharacterId.error;
      }
      current.push({
        accountDisplayName: accountDisplayName.value,
        accountId: placement.accountId as MargonemAccountId,
        accountOwnerUserImage: placement.accountOwnerUserImage,
        accountOwnerUserName: placement.accountOwnerUserName,
        avatarUrl: placement.avatarUrl,
        characterId: placement.characterId,
        level: placement.level,
        margonemCharacterId: margonemCharacterId.value,
        name: placement.name,
        placementId: placement.placementId,
        position: placement.position,
        profession: profession.value,
      });
      charactersBySquadId.set(placement.squadId, current);
    }

    const ownerUserId = parseAppUserId(group.ownerUserId);
    if (isError(ownerUserId)) {
      throw ownerUserId.error;
    }
    const visibility = parseSquadGroupVisibility(group.visibility);
    if (isError(visibility)) {
      throw visibility.error;
    }

    return ok({
      accessRole: access.value.role,
      groupId,
      name: group.name,
      ownerUserId: ownerUserId.value,
      squads: squadRows.map((row) => ({
        characters: charactersBySquadId.get(row.id) ?? [],
        name: row.name,
        position: row.position,
        squadId: row.id as SquadId,
      })),
      updatedAt: group.updatedAt,
      visibility: visibility.value,
    });
  }

  /** Classify a unique-profile-id violation by re-reading the owner. */
  private async classifyDuplicateProfileId(
    actorUserId: AppUserId,
    profileId: MargonemProfileId
  ): Promise<DuplicateMargonemAccountError> {
    try {
      const [existing] = await this.database
        .select({ ownerUserId: margonemAccount.ownerUserId })
        .from(margonemAccount)
        .where(eq(margonemAccount.profileId, profileIdToNumber(profileId)))
        .limit(1);

      if (existing === undefined) {
        return { _tag: "MargonemAccountAlreadyOwnedByActor" };
      }

      return existing.ownerUserId === appUserIdToString(actorUserId)
        ? { _tag: "MargonemAccountAlreadyOwnedByActor" }
        : { _tag: "MargonemAccountOwnedByAnotherUser" };
    } catch {
      return { _tag: "MargonemAccountAlreadyOwnedByActor" };
    }
  }
}

import type { AccountAccessStatus } from "../account-access-status.js";
import type { AccountDisplayName } from "../account-display-name.js";
import type {
  ListOwnedMargonemAccountsInput,
  OwnedMargonemAccountReader,
  OwnedMargonemAccountSummary,
  SquadBuilderPersistenceUnavailable,
} from "../account-import/account-import-store.js";
import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountAccessId } from "../margonem-account-access-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import type { MargonemProfileId } from "../margonem-profile-id.js";
import type { Result } from "../result.js";

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

/** Expected failure when a Margonem account does not exist. */
export interface MargonemAccountNotFound {
  readonly _tag: "MargonemAccountNotFound";
}

/** Expected failure when an actor is not the Margonem account owner. */
export interface ActorDoesNotOwnMargonemAccount {
  readonly _tag: "ActorDoesNotOwnMargonemAccount";
}

/** Owner-only authorization capability for a Margonem account. */
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
      MargonemAccountNotFound | SquadBuilderPersistenceUnavailable
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
      | ActorDoesNotOwnMargonemAccount
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

/** Account sharing persistence contracts used by invite and grant services. */
export type AccountSharingPersistenceStore = AccountSharingStore &
  MargonemAccountOwnerAuthorizer;

export type {
  ListOwnedMargonemAccountsInput,
  OwnedMargonemAccountReader,
  OwnedMargonemAccountSummary,
  SquadBuilderPersistenceUnavailable,
};

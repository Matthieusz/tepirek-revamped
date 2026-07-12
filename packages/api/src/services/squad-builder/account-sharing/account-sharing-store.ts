import type { AccountAccessStatus } from "../../../domain/squad-builder/account-access-status.ts";
import type { AccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import type {
  ListOwnedMargonemAccountsInput,
  OwnedMargonemAccountSummary,
  SquadBuilderPersistenceUnavailable,
} from "../account-import/account-import-store.ts";
import type {
  AccountAccessInviteNotFound,
  AccountAccessTransitionNotAllowed,
  ActorDoesNotOwnMargonemAccount,
  ActorIsNotInviteRecipient,
  CannotInviteSelf,
  InviteTargetNotFound,
  InviteTargetNotVerified,
  MargonemAccountNotFound,
} from "../squad-groups/squad-group-errors.ts";
/** Expected authorization failures for account sharing operations. */
export type AccountSharingAuthorizationError =
  | MargonemAccountNotFound
  | ActorDoesNotOwnMargonemAccount
  | CannotInviteSelf
  | InviteTargetNotFound
  | InviteTargetNotVerified
  | AccountAccessInviteNotFound
  | ActorIsNotInviteRecipient
  | AccountAccessTransitionNotAllowed;

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
export type { MargonemAccountNotFound };

/** Expected failure when an actor is not the Margonem account owner. */
export type { ActorDoesNotOwnMargonemAccount };

export type {
  ListOwnedMargonemAccountsInput,
  OwnedMargonemAccountSummary,
  SquadBuilderPersistenceUnavailable,
};

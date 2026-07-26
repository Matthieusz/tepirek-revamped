import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type {
  AccountAccessInviteNotFound,
  AccountAccessTransitionNotAllowed,
  ActorDoesNotOwnMargonemAccount,
  ActorIsNotInviteRecipient,
  EffectSquadBuilderPersistenceUnavailable,
  InviteTargetNotFound,
  InviteTargetNotVerified,
  MargonemAccountNotFound,
} from "../squad-groups/squad-group-errors.ts";
import type {
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  AccountInviteTarget,
  FindOwnedAccountForSharingInput,
  FindVerifiedInviteTargetInput,
  ListAccountAccessGrantsInput,
  ListIncomingAccountInvitesInput,
  ListOwnedMargonemAccountsInput,
  ListSharedAccountsInput,
  OwnedAccountForSharing,
  OwnedMargonemAccountSummary,
  RespondToAccountAccessInviteStoreInput,
  RevokeAccountAccessResult,
  RevokeAccountAccessStoreInput,
  SearchInviteTargetsStoreInput,
  SharedMargonemAccountSummary,
  UpsertAccountAccessInviteInput,
  VerifiedInviteTarget,
} from "./account-sharing-store.ts";

/** Persistence operations used by account sharing workflows. */
export interface AccountSharingStoreServiceShape {
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
  readonly listOwnedAccounts: (
    input: ListOwnedMargonemAccountsInput
  ) => Effect<
    readonly OwnedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable
  >;
}

export class AccountSharingStoreService extends Context.Service<
  AccountSharingStoreService,
  AccountSharingStoreServiceShape
>()("@tepirek-revamped/api/squad-builder/AccountSharingStoreService") {}

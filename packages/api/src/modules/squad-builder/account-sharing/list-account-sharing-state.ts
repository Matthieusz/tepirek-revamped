import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import { err, isError, ok } from "../result.js";
import type { Result } from "../result.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type {
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  AccountSharingStore,
  SharedMargonemAccountSummary,
} from "./account-sharing-store.js";

/** Input for listing incoming account invites. */
export interface ListIncomingAccountInvitesInput {
  readonly actorUserId: AppUserId;
}

/** Input for listing accounts shared with the actor. */
export interface ListSharedAccountsInput {
  readonly actorUserId: AppUserId;
}

/** Input for listing access grants for an owned account. */
export interface ListAccountAccessGrantsInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
}

/** Service module that reads account sharing state for the actor. */
export class ListAccountSharingState {
  private readonly store: AccountSharingStore;

  constructor(store: AccountSharingStore) {
    this.store = store;
  }

  /** List pending account access invites received by the actor. */
  async listIncomingInvites(
    input: ListIncomingAccountInvitesInput
  ): Promise<
    Result<readonly AccountAccessInviteSummary[], AccountSharingError>
  > {
    const result = await this.store.listIncomingAccountInvites({
      actorUserId: input.actorUserId,
    });

    if (isError(result)) {
      return err(result.error);
    }

    return ok(result.value);
  }

  /** List Margonem accounts shared with (accepted by) the actor. */
  async listSharedAccounts(
    input: ListSharedAccountsInput
  ): Promise<
    Result<readonly SharedMargonemAccountSummary[], AccountSharingError>
  > {
    const result = await this.store.listSharedAccounts({
      actorUserId: input.actorUserId,
    });

    if (isError(result)) {
      return err(result.error);
    }

    return ok(result.value);
  }

  /** List pending and accepted access grants for an owned account. */
  async listAccountAccessGrants(
    input: ListAccountAccessGrantsInput
  ): Promise<
    Result<readonly AccountAccessGrantSummary[], AccountSharingError>
  > {
    const owned = await this.store.findOwnedAccountForSharing({
      accountId: input.accountId,
      actorUserId: input.actorUserId,
    });

    if (isError(owned)) {
      return err(owned.error);
    }

    if (owned.value.ownerUserId !== input.actorUserId) {
      return err({ _tag: "ActorDoesNotOwnMargonemAccount" });
    }

    const result = await this.store.listAccountAccessGrants({
      accountId: input.accountId,
      actorUserId: input.actorUserId,
    });

    if (isError(result)) {
      return err(result.error);
    }

    return ok(result.value);
  }
}

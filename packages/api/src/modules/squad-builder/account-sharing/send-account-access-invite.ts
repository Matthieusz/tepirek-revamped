import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import { fail, isFailure, success } from "../outcome.js";
import type { Outcome } from "../outcome.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type {
  AccountAccessInviteSummary,
  AccountSharingStore,
} from "./account-sharing-store.js";

/** Input for sending an account access invite. */
export interface SendAccountAccessInviteInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly invitedUserId: AppUserId;
}

/** Service module that sends account access invites as the account owner. */
export class SendAccountAccessInvite {
  private readonly store: AccountSharingStore;
  private readonly clock: Clock;

  constructor(store: AccountSharingStore, clock: Clock) {
    this.store = store;
    this.clock = clock;
  }

  /** Send or re-send an account access invitation. */
  async send(
    input: SendAccountAccessInviteInput
  ): Promise<Outcome<AccountAccessInviteSummary, AccountSharingError>> {
    const owned = await this.store.findOwnedAccountForSharing({
      accountId: input.accountId,
      actorUserId: input.actorUserId,
    });

    if (isFailure(owned)) {
      return fail(owned.error);
    }

    if (owned.value.ownerUserId !== input.actorUserId) {
      return fail({ _tag: "ActorDoesNotOwnMargonemAccount" });
    }

    if (input.actorUserId === input.invitedUserId) {
      return fail({ _tag: "CannotInviteSelf" });
    }

    const target = await this.store.findVerifiedInviteTarget({
      targetUserId: input.invitedUserId,
    });

    if (isFailure(target)) {
      return fail(target.error);
    }

    const now = this.clock.now();
    const invite = await this.store.upsertAccountAccessInvite({
      accountId: input.accountId,
      invitedUserId: target.value.userId,
      now,
      ownerUserId: input.actorUserId,
    });

    if (isFailure(invite)) {
      return fail(invite.error);
    }

    return success(invite.value);
  }
}

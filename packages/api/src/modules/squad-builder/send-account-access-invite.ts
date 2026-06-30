import type { AccountSharingError } from "./account-sharing-error";
import type { AppUserId } from "./app-user-id";
import type { MargonemAccountId } from "./margonem-account-id";
import type { Clock } from "./preview-margonem-profile-import";
import { err, isError, ok } from "./result";
import type { Result } from "./result";
import type {
  AccountAccessInviteSummary,
  AccountSharingStore,
} from "./squad-builder-store";

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
  ): Promise<Result<AccountAccessInviteSummary, AccountSharingError>> {
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

    if (input.actorUserId === input.invitedUserId) {
      return err({ _tag: "CannotInviteSelf" });
    }

    const target = await this.store.findVerifiedInviteTarget({
      targetUserId: input.invitedUserId,
    });

    if (isError(target)) {
      return err(target.error);
    }

    const now = this.clock.now();
    const invite = await this.store.upsertAccountAccessInvite({
      accountId: input.accountId,
      invitedUserId: target.value.userId,
      now,
      ownerUserId: input.actorUserId,
    });

    if (isError(invite)) {
      return err(invite.error);
    }

    return ok(invite.value);
  }
}

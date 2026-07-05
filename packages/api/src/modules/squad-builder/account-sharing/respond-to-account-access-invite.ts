import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountAccessId } from "../margonem-account-access-id.js";
import { fail, isFailure, success } from "../outcome.js";
import type { Outcome } from "../outcome.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type {
  AccountAccessInviteSummary,
  AccountSharingStore,
} from "./account-sharing-store.js";

/** Input for responding to an account access invite. */
export interface RespondToAccountAccessInviteInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
  readonly response: "accept" | "decline";
}

/** Service module that lets invited users accept or decline invites. */
export class RespondToAccountAccessInvite {
  private readonly store: AccountSharingStore;
  private readonly clock: Clock;

  constructor(store: AccountSharingStore, clock: Clock) {
    this.store = store;
    this.clock = clock;
  }

  /** Accept or decline an account access invite as the invited user. */
  async respond(
    input: RespondToAccountAccessInviteInput
  ): Promise<Outcome<AccountAccessInviteSummary, AccountSharingError>> {
    const now = this.clock.now();
    const result = await this.store.respondToAccountAccessInvite({
      accessId: input.accessId,
      invitedUserId: input.actorUserId,
      now,
      response: input.response,
    });

    if (isFailure(result)) {
      return fail(result.error);
    }

    return success(result.value);
  }
}

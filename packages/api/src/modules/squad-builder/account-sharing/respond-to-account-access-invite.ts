import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { AppUserId } from "../app-user-id";
import type { MargonemAccountAccessId } from "../margonem-account-access-id";
import { err, isError, ok } from "../result";
import type { Result } from "../result";
import type { AccountSharingError } from "./account-sharing-error";
import type {
  AccountAccessInviteSummary,
  AccountSharingStore,
} from "./account-sharing-store";

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
  ): Promise<Result<AccountAccessInviteSummary, AccountSharingError>> {
    const now = this.clock.now();
    const result = await this.store.respondToAccountAccessInvite({
      accessId: input.accessId,
      invitedUserId: input.actorUserId,
      now,
      response: input.response,
    });

    if (isError(result)) {
      return err(result.error);
    }

    return ok(result.value);
  }
}

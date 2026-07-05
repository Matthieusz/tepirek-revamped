import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountAccessId } from "../margonem-account-access-id.js";
import { fail, isFailure, success } from "../outcome.js";
import type { Outcome } from "../outcome.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type {
  AccountSharingStore,
  RevokeAccountAccessResult,
} from "./account-sharing-store.js";

/** Input for revoking account access. */
export interface RevokeAccountAccessInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
}

/** Service module that revokes account access as the account owner. */
export class RevokeAccountAccess {
  private readonly store: AccountSharingStore;
  private readonly clock: Clock;

  constructor(store: AccountSharingStore, clock: Clock) {
    this.store = store;
    this.clock = clock;
  }

  /** Revoke pending or accepted account access as the account owner. */
  async revoke(
    input: RevokeAccountAccessInput
  ): Promise<Outcome<RevokeAccountAccessResult, AccountSharingError>> {
    const now = this.clock.now();
    const result = await this.store.revokeAccountAccess({
      accessId: input.accessId,
      now,
      ownerUserId: input.actorUserId,
    });

    if (isFailure(result)) {
      return fail(result.error);
    }

    return success(result.value);
  }
}

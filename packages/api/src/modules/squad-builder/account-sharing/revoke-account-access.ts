import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { AppUserId } from "../app-user-id";
import type { MargonemAccountAccessId } from "../margonem-account-access-id";
import { err, isError, ok } from "../result";
import type { Result } from "../result";
import type { AccountSharingError } from "./account-sharing-error";
import type {
  AccountSharingStore,
  RevokeAccountAccessResult,
} from "./account-sharing-store";

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
  ): Promise<Result<RevokeAccountAccessResult, AccountSharingError>> {
    const now = this.clock.now();
    const result = await this.store.revokeAccountAccess({
      accessId: input.accessId,
      now,
      ownerUserId: input.actorUserId,
    });

    if (isError(result)) {
      return err(result.error);
    }

    return ok(result.value);
  }
}

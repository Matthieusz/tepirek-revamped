import type { Effect } from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type { RevokeAccountAccessResult } from "./account-sharing-store.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import type { RevokeAccountAccessInput } from "./revoke-account-access.js";

/** Effect service module that revokes account access as the account owner. */
export class EffectRevokeAccountAccess {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Revoke pending or accepted account access as the account owner. */
  revoke(
    input: RevokeAccountAccessInput
  ): Effect<
    RevokeAccountAccessResult,
    AccountSharingError,
    EffectAccountSharingStore
  > {
    const now = this.clock.now();

    return EffectAccountSharingStore.use((store) =>
      store.revokeAccountAccess({
        accessId: input.accessId,
        now,
        ownerUserId: input.actorUserId,
      })
    );
  }
}

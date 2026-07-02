import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { AccountSharingError } from "./account-sharing-error";
import type { RevokeAccountAccessResult } from "./account-sharing-store";
import { EffectAccountSharingStore } from "./effect-account-sharing-store";
import type { RevokeAccountAccessInput } from "./revoke-account-access";

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

    return EffectRuntime.gen(function* revokeAccountAccessEffect() {
      return yield* EffectAccountSharingStore.use((store) =>
        store.revokeAccountAccess({
          accessId: input.accessId,
          now,
          ownerUserId: input.actorUserId,
        })
      );
    });
  }
}

import * as Clock from "effect/Clock";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type { AccountSharingError } from "./account-sharing-error.js";
import type { RevokeAccountAccessResult } from "./account-sharing-store.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import type { RevokeAccountAccessInput } from "./revoke-account-access.js";

/** Effect service module that revokes account access as the account owner. */
export class EffectRevokeAccountAccess {
  private readonly currentDate = Clock.currentTimeMillis.pipe(
    EffectRuntime.map((milliseconds) => new Date(milliseconds))
  );

  /** Revoke pending or accepted account access as the account owner. */
  readonly revoke = (
    input: RevokeAccountAccessInput
  ): Effect<
    RevokeAccountAccessResult,
    AccountSharingError,
    EffectAccountSharingStore
  > =>
    this.currentDate.pipe(
      EffectRuntime.flatMap((now) =>
        EffectAccountSharingStore.use((store) =>
          store.revokeAccountAccess({
            accessId: input.accessId,
            now,
            ownerUserId: input.actorUserId,
          })
        )
      )
    );
}

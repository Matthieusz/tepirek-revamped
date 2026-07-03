import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type { RevokeAccountAccessResult } from "./account-sharing-store.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import type { RevokeAccountAccessInput } from "./revoke-account-access.js";

export interface Interface {
  /** Revoke pending or accepted account access as the account owner. */
  readonly revoke: (
    input: RevokeAccountAccessInput
  ) => Effect<RevokeAccountAccessResult, AccountSharingError>;
}

/** Effect service module that revokes account access as the account owner. */
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/AccountAccessRevocations"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* makeAccountAccessRevocationsService() {
    const store = yield* EffectAccountSharingStore;

    return {
      revoke: EffectRuntime.fn("AccountAccessRevocations.revoke")(
        function* revoke(input) {
          const now = new Date(yield* Clock.currentTimeMillis);

          return yield* store.revokeAccountAccess({
            accessId: input.accessId,
            now,
            ownerUserId: input.actorUserId,
          });
        }
      ),
    };
  })
);

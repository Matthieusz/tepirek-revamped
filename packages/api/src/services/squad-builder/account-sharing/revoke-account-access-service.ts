import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import type { AccountSharingError } from "./account-sharing-error.ts";
import { AccountSharingStoreService } from "./account-sharing-store-service.ts";
import type { RevokeAccountAccessResult } from "./account-sharing-store.ts";

/** Input for revoking account access. */
export interface RevokeAccountAccessInput {
  readonly actorUserId: AppUserId;
  readonly accessId: MargonemAccountAccessId;
}

export interface AccountAccessRevocations {
  /** Revoke pending or accepted account access as the account owner. */
  readonly revoke: (
    input: RevokeAccountAccessInput
  ) => Effect<RevokeAccountAccessResult, AccountSharingError>;
}

/** Service module that revokes account access as the account owner. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class AccountAccessRevocationsService extends Context.Service<
  AccountAccessRevocationsService,
  AccountAccessRevocations
>()("@tepirek-revamped/api/squad-builder/AccountAccessRevocations") {}

export const layer = Layer.effect(
  AccountAccessRevocationsService,
  EffectRuntime.gen(function* makeAccountAccessRevocationsService() {
    const store = yield* AccountSharingStoreService;

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

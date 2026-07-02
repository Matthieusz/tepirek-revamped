import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type { AccountAccessInviteSummary } from "./account-sharing-store.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import type { SendAccountAccessInviteInput } from "./send-account-access-invite.js";

/** Effect service module that sends account access invites as the account owner. */
export class EffectSendAccountAccessInvite {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Send or re-send an account access invitation. */
  send(
    input: SendAccountAccessInviteInput
  ): Effect<
    AccountAccessInviteSummary,
    AccountSharingError,
    EffectAccountSharingStore
  > {
    const now = this.clock.now();

    return EffectRuntime.gen(function* sendAccountAccessInviteEffect() {
      const owned = yield* EffectAccountSharingStore.use((store) =>
        store.findOwnedAccountForSharing({
          accountId: input.accountId,
          actorUserId: input.actorUserId,
        })
      );

      if (owned.ownerUserId !== input.actorUserId) {
        return yield* EffectRuntime.fail({
          _tag: "ActorDoesNotOwnMargonemAccount" as const,
        });
      }

      if (input.actorUserId === input.invitedUserId) {
        return yield* EffectRuntime.fail({ _tag: "CannotInviteSelf" as const });
      }

      const target = yield* EffectAccountSharingStore.use((store) =>
        store.findVerifiedInviteTarget({ targetUserId: input.invitedUserId })
      );

      return yield* EffectAccountSharingStore.use((store) =>
        store.upsertAccountAccessInvite({
          accountId: input.accountId,
          invitedUserId: target.userId,
          now,
          ownerUserId: input.actorUserId,
        })
      );
    });
  }
}

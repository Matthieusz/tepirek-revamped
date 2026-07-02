import * as Clock from "effect/Clock";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import {
  ActorDoesNotOwnMargonemAccount,
  CannotInviteSelf,
} from "../squad-groups/squad-group-errors.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type { AccountAccessInviteSummary } from "./account-sharing-store.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import type { SendAccountAccessInviteInput } from "./send-account-access-invite.js";

/** Effect service module that sends account access invites as the account owner. */
export class EffectSendAccountAccessInvite {
  private readonly currentDate = Clock.currentTimeMillis.pipe(
    EffectRuntime.map((milliseconds) => new Date(milliseconds))
  );

  /** Send or re-send an account access invitation. */
  readonly send = (
    input: SendAccountAccessInviteInput
  ): Effect<
    AccountAccessInviteSummary,
    AccountSharingError,
    EffectAccountSharingStore
  > => {
    const { currentDate } = this;

    return EffectRuntime.gen(function* sendAccountAccessInviteEffect() {
      const now = yield* currentDate;
      const owned = yield* EffectAccountSharingStore.use((store) =>
        store.findOwnedAccountForSharing({
          accountId: input.accountId,
          actorUserId: input.actorUserId,
        })
      );

      if (owned.ownerUserId !== input.actorUserId) {
        return yield* new ActorDoesNotOwnMargonemAccount();
      }

      if (input.actorUserId === input.invitedUserId) {
        return yield* new CannotInviteSelf();
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
  };
}

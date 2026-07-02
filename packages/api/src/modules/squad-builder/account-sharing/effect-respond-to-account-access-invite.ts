import type { Effect } from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type { AccountAccessInviteSummary } from "./account-sharing-store.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import type { RespondToAccountAccessInviteInput } from "./respond-to-account-access-invite.js";

/** Effect service module that lets invited users accept or decline account access invites. */
export class EffectRespondToAccountAccessInvite {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Accept or decline an account access invite as the invited user. */
  respond(
    input: RespondToAccountAccessInviteInput
  ): Effect<
    AccountAccessInviteSummary,
    AccountSharingError,
    EffectAccountSharingStore
  > {
    const now = this.clock.now();

    return EffectAccountSharingStore.use((store) =>
      store.respondToAccountAccessInvite({
        accessId: input.accessId,
        invitedUserId: input.actorUserId,
        now,
        response: input.response,
      })
    );
  }
}

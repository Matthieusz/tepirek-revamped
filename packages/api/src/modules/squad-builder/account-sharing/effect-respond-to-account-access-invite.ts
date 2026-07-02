import * as Clock from "effect/Clock";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type { AccountSharingError } from "./account-sharing-error.js";
import type { AccountAccessInviteSummary } from "./account-sharing-store.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import type { RespondToAccountAccessInviteInput } from "./respond-to-account-access-invite.js";

/** Effect service module that lets invited users accept or decline account access invites. */
export class EffectRespondToAccountAccessInvite {
  private readonly currentDate = Clock.currentTimeMillis.pipe(
    EffectRuntime.map((milliseconds) => new Date(milliseconds))
  );

  /** Accept or decline an account access invite as the invited user. */
  readonly respond = (
    input: RespondToAccountAccessInviteInput
  ): Effect<
    AccountAccessInviteSummary,
    AccountSharingError,
    EffectAccountSharingStore
  > =>
    this.currentDate.pipe(
      EffectRuntime.flatMap((now) =>
        EffectAccountSharingStore.use((store) =>
          store.respondToAccountAccessInvite({
            accessId: input.accessId,
            invitedUserId: input.actorUserId,
            now,
            response: input.response,
          })
        )
      )
    );
}

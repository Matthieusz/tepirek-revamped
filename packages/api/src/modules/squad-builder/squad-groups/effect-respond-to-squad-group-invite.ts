import * as Clock from "effect/Clock";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type { RespondToSquadGroupInvite } from "./respond-to-squad-group-invite.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";
import type { SquadGroupInvitationSummary } from "./squad-group-store.js";

/** Effect service module that lets invited users accept or decline squad group editor invites. */
export class EffectRespondToSquadGroupInvite {
  private readonly currentDate = Clock.currentTimeMillis.pipe(
    EffectRuntime.map((milliseconds) => new Date(milliseconds))
  );

  /** Accept or decline a squad group editor invite as the invited user. */
  readonly respond = (
    input: Parameters<RespondToSquadGroupInvite["respond"]>[0]
  ): Effect<
    SquadGroupInvitationSummary,
    SquadGroupSharingError,
    EffectSquadGroupStore
  > =>
    this.currentDate.pipe(
      EffectRuntime.flatMap((now) =>
        EffectSquadGroupStore.use((store) =>
          store.respondToSquadGroupInvite({
            invitationId: input.invitationId,
            invitedUserId: input.actorUserId,
            now,
            response: input.response,
          })
        )
      )
    );
}

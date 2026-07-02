import type { Effect } from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { RespondToSquadGroupInvite } from "./respond-to-squad-group-invite.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";
import type { SquadGroupInvitationSummary } from "./squad-group-store.js";

/** Effect service module that lets invited users accept or decline squad group editor invites. */
export class EffectRespondToSquadGroupInvite {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Accept or decline a squad group editor invite as the invited user. */
  respond(
    input: Parameters<RespondToSquadGroupInvite["respond"]>[0]
  ): Effect<
    SquadGroupInvitationSummary,
    SquadGroupSharingError,
    EffectSquadGroupStore
  > {
    const now = this.clock.now();

    return EffectSquadGroupStore.use((store) =>
      store.respondToSquadGroupInvite({
        invitationId: input.invitationId,
        invitedUserId: input.actorUserId,
        now,
        response: input.response,
      })
    );
  }
}

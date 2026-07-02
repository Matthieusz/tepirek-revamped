import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { RespondToSquadGroupInvite } from "./respond-to-squad-group-invite";
import type { SquadGroupSharingError } from "./squad-group-sharing-error";
import { EffectSquadGroupStore } from "./squad-group-store";
import type { SquadGroupInvitationSummary } from "./squad-group-store";

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

    return EffectRuntime.gen(function* respondToSquadGroupInviteEffect() {
      return yield* EffectSquadGroupStore.use((store) =>
        store.respondToSquadGroupInvite({
          invitationId: input.invitationId,
          invitedUserId: input.actorUserId,
          now,
          response: input.response,
        })
      );
    });
  }
}

import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { SendSquadGroupEditorInvite } from "./send-squad-group-editor-invite.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";
import type { SquadGroupInvitationSummary } from "./squad-group-store.js";

/** Effect service module that sends squad group editor invitations as the group owner. */
export class EffectSendSquadGroupEditorInvite {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Send or re-send a squad group editor invitation. */
  send(
    input: Parameters<SendSquadGroupEditorInvite["send"]>[0]
  ): Effect<
    SquadGroupInvitationSummary,
    SquadGroupSharingError,
    EffectSquadGroupStore
  > {
    const now = this.clock.now();

    return EffectRuntime.gen(function* sendSquadGroupEditorInviteEffect() {
      yield* EffectSquadGroupStore.use((store) =>
        store.authorizeSquadGroupOwner({
          actorUserId: input.actorUserId,
          groupId: input.groupId,
        })
      );

      if (input.actorUserId === input.invitedUserId) {
        return yield* EffectRuntime.fail({ _tag: "CannotInviteSelf" as const });
      }

      const target = yield* EffectSquadGroupStore.use((store) =>
        store.findVerifiedSquadEditorInviteTarget({
          targetUserId: input.invitedUserId,
        })
      );

      return yield* EffectSquadGroupStore.use((store) =>
        store.upsertSquadGroupEditorInvite({
          groupId: input.groupId,
          invitedUserId: target.userId,
          now,
          ownerUserId: input.actorUserId,
        })
      );
    });
  }
}

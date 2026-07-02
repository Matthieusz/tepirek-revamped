import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import";
import type { RevokeSquadGroupEditor } from "./revoke-squad-group-editor";
import type { SquadGroupSharingError } from "./squad-group-sharing-error";
import { EffectSquadGroupStore } from "./squad-group-store";
import type { SquadGroupInvitationSummary } from "./squad-group-store";

/** Effect service module that revokes pending or accepted squad group editor access. */
export class EffectRevokeSquadGroupEditor {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Revoke pending or accepted editor access as the squad group owner. */
  revoke(
    input: Parameters<RevokeSquadGroupEditor["revoke"]>[0]
  ): Effect<
    SquadGroupInvitationSummary,
    SquadGroupSharingError,
    EffectSquadGroupStore
  > {
    const now = this.clock.now();

    return EffectRuntime.gen(function* revokeSquadGroupEditorEffect() {
      return yield* EffectSquadGroupStore.use((store) =>
        store.revokeSquadGroupEditor({
          invitationId: input.invitationId,
          now,
          ownerUserId: input.actorUserId,
        })
      );
    });
  }
}

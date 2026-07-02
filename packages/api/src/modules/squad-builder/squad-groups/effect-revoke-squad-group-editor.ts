import type { Effect } from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { RevokeSquadGroupEditor } from "./revoke-squad-group-editor.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";
import type { SquadGroupInvitationSummary } from "./squad-group-store.js";

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

    return EffectSquadGroupStore.use((store) =>
      store.revokeSquadGroupEditor({
        invitationId: input.invitationId,
        now,
        ownerUserId: input.actorUserId,
      })
    );
  }
}

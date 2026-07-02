import * as Clock from "effect/Clock";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import type { RevokeSquadGroupEditor } from "./revoke-squad-group-editor.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";
import type { SquadGroupInvitationSummary } from "./squad-group-store.js";

/** Effect service module that revokes pending or accepted squad group editor access. */
export class EffectRevokeSquadGroupEditor {
  private readonly currentDate = Clock.currentTimeMillis.pipe(
    EffectRuntime.map((milliseconds) => new Date(milliseconds))
  );

  /** Revoke pending or accepted editor access as the squad group owner. */
  readonly revoke = (
    input: Parameters<RevokeSquadGroupEditor["revoke"]>[0]
  ): Effect<
    SquadGroupInvitationSummary,
    SquadGroupSharingError,
    EffectSquadGroupStore
  > =>
    this.currentDate.pipe(
      EffectRuntime.flatMap((now) =>
        EffectSquadGroupStore.use((store) =>
          store.revokeSquadGroupEditor({
            invitationId: input.invitationId,
            now,
            ownerUserId: input.actorUserId,
          })
        )
      )
    );
}

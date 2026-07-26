import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

/** Revoke pending or accepted squad group editor access. */
export const revoke = EffectRuntime.fn("SquadGroups.revokeEditor")(
  function* revoke(input: {
    readonly actorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
  }) {
    const store = yield* SquadGroupStoreService;
    const now = yield* DateTime.nowAsDate;
    return yield* store.revokeSquadGroupEditor({
      invitationId: input.invitationId,
      now,
      ownerUserId: input.actorUserId,
    });
  }
);

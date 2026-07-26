import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

/** Accept or decline a squad group editor invite. */
export const respond = EffectRuntime.fn("SquadGroups.respondToEditorInvite")(
  function* respond(input: {
    readonly actorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
    readonly response: "accept" | "decline";
  }) {
    const store = yield* SquadGroupStoreService;
    const now = yield* DateTime.nowAsDate;
    return yield* store.respondToSquadGroupInvite({
      invitationId: input.invitationId,
      invitedUserId: input.actorUserId,
      now,
      response: input.response,
    });
  }
);

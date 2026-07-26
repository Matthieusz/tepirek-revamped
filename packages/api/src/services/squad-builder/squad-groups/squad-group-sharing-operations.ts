import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

/** Input for responding to a squad group editor invite. */
export interface RespondToSquadGroupInviteInput {
  readonly actorUserId: AppUserId;
  readonly invitationId: SquadGroupInvitationId;
  readonly response: "accept" | "decline";
}

/** Input for revoking squad group editor access. */
export interface RevokeSquadGroupEditorInput {
  readonly actorUserId: AppUserId;
  readonly invitationId: SquadGroupInvitationId;
}

/** Accept or decline a squad group editor invite. */
export const respond = Effect.fn("SquadGroups.respondToEditorInvite")(
  function* respond(input: RespondToSquadGroupInviteInput) {
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

/** Revoke pending or accepted squad group editor access. */
export const revoke = Effect.fn("SquadGroups.revokeEditor")(function* revoke(
  input: RevokeSquadGroupEditorInput
) {
  const store = yield* SquadGroupStoreService;
  const now = yield* DateTime.nowAsDate;
  return yield* store.revokeSquadGroupEditor({
    invitationId: input.invitationId,
    now,
    ownerUserId: input.actorUserId,
  });
});

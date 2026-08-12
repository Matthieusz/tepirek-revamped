import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { SquadGroupDirectoryStoreService } from "./squad-group-directory-store.ts";
import { CannotInviteSelf } from "./squad-group-errors.ts";
import { SquadGroupSharingStoreService } from "./squad-group-sharing-store.ts";

/** Send or re-send a squad group editor invitation. */
export const send = EffectRuntime.fn("SquadGroups.sendEditorInvite")(
  function* send(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly invitedUserId: AppUserId;
  }) {
    const directoryStore = yield* SquadGroupDirectoryStoreService;
    const sharingStore = yield* SquadGroupSharingStoreService;
    const now = yield* DateTime.nowAsDate;
    yield* sharingStore.authorizeSquadGroupOwner({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
    });
    if (input.actorUserId === input.invitedUserId) {
      return yield* new CannotInviteSelf();
    }
    const target = yield* directoryStore.findVerifiedSquadEditorInviteTarget({
      targetUserId: input.invitedUserId,
    });
    return yield* sharingStore.upsertSquadGroupEditorInvite({
      groupId: input.groupId,
      invitedUserId: target.userId,
      now,
      ownerUserId: input.actorUserId,
    });
  }
);

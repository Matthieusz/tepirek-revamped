import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { CannotInviteSelf } from "./squad-group-errors.ts";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";
import type { SquadGroupInvitationSummary } from "./squad-group-store.ts";

export interface SquadGroupEditorInvites {
  /** Send or re-send a squad group editor invitation. */
  readonly send: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly invitedUserId: AppUserId;
  }) => Effect<SquadGroupInvitationSummary, SquadGroupSharingError>;
}

/** Service module that sends squad group editor invitations as the group owner. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class SquadGroupEditorInvitesService extends Context.Service<
  SquadGroupEditorInvitesService,
  SquadGroupEditorInvites
>()("@tepirek-revamped/api/squad-builder/SquadGroupEditorInvites") {}

export const layer = Layer.effect(
  SquadGroupEditorInvitesService,
  EffectRuntime.gen(function* makeSquadGroupEditorInvitesService() {
    const store = yield* SquadGroupStoreService;

    return SquadGroupEditorInvitesService.of({
      send: EffectRuntime.fn("SquadGroupEditorInvites.send")(
        function* send(input) {
          const now = new Date(yield* Clock.currentTimeMillis);
          yield* store.authorizeSquadGroupOwner({
            actorUserId: input.actorUserId,
            groupId: input.groupId,
          });

          if (input.actorUserId === input.invitedUserId) {
            return yield* new CannotInviteSelf();
          }

          const target = yield* store.findVerifiedSquadEditorInviteTarget({
            targetUserId: input.invitedUserId,
          });

          return yield* store.upsertSquadGroupEditorInvite({
            groupId: input.groupId,
            invitedUserId: target.userId,
            now,
            ownerUserId: input.actorUserId,
          });
        }
      ),
    });
  })
);

import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import type { SendSquadGroupEditorInvite } from "./send-squad-group-editor-invite.js";
import { CannotInviteSelf } from "./squad-group-errors.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { SquadGroupStoreService } from "./squad-group-store.js";
import type { SquadGroupInvitationSummary } from "./squad-group-store.js";

export interface Interface {
  /** Send or re-send a squad group editor invitation. */
  readonly send: (
    input: Parameters<SendSquadGroupEditorInvite["send"]>[0]
  ) => Effect<SquadGroupInvitationSummary, SquadGroupSharingError>;
}

/** Service module that sends squad group editor invitations as the group owner. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/SquadGroupEditorInvites"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* makeSquadGroupEditorInvitesService() {
    const store = yield* SquadGroupStoreService;

    return {
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
    };
  })
);

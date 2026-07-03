import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import type { RespondToSquadGroupInvite } from "./respond-to-squad-group-invite.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";
import type { SquadGroupInvitationSummary } from "./squad-group-store.js";

export interface Interface {
  /** Accept or decline a squad group editor invite as the invited user. */
  readonly respond: (
    input: Parameters<RespondToSquadGroupInvite["respond"]>[0]
  ) => Effect<SquadGroupInvitationSummary, SquadGroupSharingError>;
}

/** Effect service module that lets invited users accept or decline squad group editor invites. */
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/SquadGroupEditorInviteResponses"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* makeSquadGroupEditorInviteResponsesService() {
    const store = yield* EffectSquadGroupStore;

    return {
      respond: EffectRuntime.fn("SquadGroupEditorInvites.respond")(
        function* respond(input) {
          const now = new Date(yield* Clock.currentTimeMillis);

          return yield* store.respondToSquadGroupInvite({
            invitationId: input.invitationId,
            invitedUserId: input.actorUserId,
            now,
            response: input.response,
          });
        }
      ),
    };
  })
);

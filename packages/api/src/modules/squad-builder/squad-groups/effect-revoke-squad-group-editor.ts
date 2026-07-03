import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import type { RevokeSquadGroupEditor } from "./revoke-squad-group-editor.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";
import type { SquadGroupInvitationSummary } from "./squad-group-store.js";

export interface Interface {
  /** Revoke pending or accepted editor access as the squad group owner. */
  readonly revoke: (
    input: Parameters<RevokeSquadGroupEditor["revoke"]>[0]
  ) => Effect<SquadGroupInvitationSummary, SquadGroupSharingError>;
}

/** Effect service module that revokes pending or accepted squad group editor access. */
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/SquadGroupEditorRevocations"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* makeSquadGroupEditorRevocationsService() {
    const store = yield* EffectSquadGroupStore;

    return {
      revoke: EffectRuntime.fn("SquadGroupEditorInvites.revoke")(
        function* revoke(input) {
          const now = new Date(yield* Clock.currentTimeMillis);

          return yield* store.revokeSquadGroupEditor({
            invitationId: input.invitationId,
            now,
            ownerUserId: input.actorUserId,
          });
        }
      ),
    };
  })
);

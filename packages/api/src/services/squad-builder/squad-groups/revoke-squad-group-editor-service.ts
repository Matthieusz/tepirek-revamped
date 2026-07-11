import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { SquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { SquadGroupStoreService } from "./squad-group-store.js";
import type { SquadGroupInvitationSummary } from "./squad-group-store.js";

export interface SquadGroupEditorRevocations {
  /** Revoke pending or accepted editor access as the squad group owner. */
  readonly revoke: (input: {
    readonly actorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
  }) => Effect<SquadGroupInvitationSummary, SquadGroupSharingError>;
}

/** Service module that revokes pending or accepted squad group editor access. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class SquadGroupEditorRevocationsService extends Context.Service<
  SquadGroupEditorRevocationsService,
  SquadGroupEditorRevocations
>()("@tepirek-revamped/api/squad-builder/SquadGroupEditorRevocations") {}

export const layer = Layer.effect(
  SquadGroupEditorRevocationsService,
  EffectRuntime.gen(function* makeSquadGroupEditorRevocationsService() {
    const store = yield* SquadGroupStoreService;

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

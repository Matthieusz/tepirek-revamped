import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import {
  inviteTargetSearchPolicy,
  parseInviteTargetQuery,
} from "../../../domain/squad-builder/invite-target-search.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";
import type { SquadEditorInviteTarget } from "./squad-group-store.ts";

export interface SquadEditorInviteTargets {
  /** Search verified users the squad group owner may invite as editors. */
  readonly search: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly query: string;
  }) => Effect<readonly SquadEditorInviteTarget[], SquadGroupSharingError>;
}

/** Service module that searches verified users a squad group owner may invite as editors. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class SquadEditorInviteTargetsService extends Context.Service<
  SquadEditorInviteTargetsService,
  SquadEditorInviteTargets
>()("@tepirek-revamped/api/squad-builder/SquadEditorInviteTargets") {}

export const layer = Layer.effect(
  SquadEditorInviteTargetsService,
  EffectRuntime.gen(function* makeSquadEditorInviteTargetsService() {
    const store = yield* SquadGroupStoreService;

    return SquadEditorInviteTargetsService.of({
      search: EffectRuntime.fn("SquadGroupEditorInvites.searchTargets")(
        function* search(input) {
          const query = yield* parseInviteTargetQuery(input.query);

          yield* store.authorizeSquadGroupOwner({
            actorUserId: input.actorUserId,
            groupId: input.groupId,
          });

          return yield* store.searchSquadEditorInviteTargets({
            groupId: input.groupId,
            maxResults: inviteTargetSearchPolicy.maxResults,
            ownerUserId: input.actorUserId,
            query,
          });
        }
      ),
    });
  })
);

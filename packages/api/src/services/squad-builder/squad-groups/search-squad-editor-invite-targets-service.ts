import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import {
  inviteTargetSearchPolicy,
  parseInviteTargetQuery,
} from "../../../domain/squad-builder/invite-target-search.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

/** Search verified users the group owner may invite. */
export const search = EffectRuntime.fn("SquadGroups.searchEditorInviteTargets")(
  function* search(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly query: string;
  }) {
    const store = yield* SquadGroupStoreService;
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
);

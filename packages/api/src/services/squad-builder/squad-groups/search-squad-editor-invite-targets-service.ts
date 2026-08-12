import * as EffectRuntime from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import {
  inviteTargetSearchPolicy,
  parseInviteTargetQuery,
} from "../../../domain/squad-builder/invite-target-search.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { SquadGroupDirectoryStoreService } from "./squad-group-directory-store.ts";
import { SquadGroupSharingStoreService } from "./squad-group-sharing-store.ts";

/** Search verified users the group owner may invite. */
export const search = EffectRuntime.fn("SquadGroups.searchEditorInviteTargets")(
  function* search(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly query: string;
  }) {
    const directoryStore = yield* SquadGroupDirectoryStoreService;
    const sharingStore = yield* SquadGroupSharingStoreService;
    const query = yield* parseInviteTargetQuery(input.query);
    yield* sharingStore.authorizeSquadGroupOwner({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
    });
    return yield* directoryStore.searchSquadEditorInviteTargets({
      groupId: input.groupId,
      maxResults: inviteTargetSearchPolicy.maxResults,
      ownerUserId: input.actorUserId,
      query,
    });
  }
);

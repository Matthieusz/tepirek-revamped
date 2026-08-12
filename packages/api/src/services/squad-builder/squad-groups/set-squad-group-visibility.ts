import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { SquadGroupVisibility } from "../../../domain/squad-builder/squad-group-visibility.ts";
import { SquadGroupAggregateStoreService } from "./squad-group-aggregate-store.ts";

/** Change squad group visibility for its owner. */
export const set = Effect.fn("SquadGroups.setVisibility")(
  function* setVisibility(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly visibility: SquadGroupVisibility;
  }) {
    const store = yield* SquadGroupAggregateStoreService;
    const now = yield* DateTime.nowAsDate;
    return yield* store.setSquadGroupVisibility({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
      now,
      visibility: input.visibility,
    });
  }
);

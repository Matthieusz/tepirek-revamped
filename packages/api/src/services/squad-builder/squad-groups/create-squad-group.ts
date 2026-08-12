import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseSquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import type { InvalidSquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import { SquadGroupAggregateStoreService } from "./squad-group-aggregate-store.ts";
import type { SquadBuilderPersistenceUnavailable } from "./squad-group-errors.ts";

/** Input for creating an empty squad group. */
export interface CreateSquadGroupInput {
  readonly actorUserId: AppUserId;
  readonly name: string;
}

/** Expected failures returned by squad group creation. */
export type CreateSquadGroupError =
  | InvalidSquadGroupName
  | SquadBuilderPersistenceUnavailable;

/** Create an empty private squad group owned by the actor. */
export const create = Effect.fn("SquadGroups.create")(
  function* createSquadGroup(input: CreateSquadGroupInput) {
    const store = yield* SquadGroupAggregateStoreService;
    const name = yield* parseSquadGroupName(input.name);

    return yield* store.createSquadGroup({
      actorUserId: input.actorUserId,
      name,
    });
  }
);

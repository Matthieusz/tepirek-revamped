import * as Effect from "effect/Effect";

import type { AppUserId } from "../app-user-id.js";
import { isError } from "../result.js";
import { parseSquadGroupName } from "../squad-name.js";
import type { InvalidSquadGroupName } from "../squad-name.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";

/** Input for creating an empty squad group. */
export interface CreateSquadGroupInput {
  readonly actorUserId: AppUserId;
  readonly name: string;
}

/** Expected failures returned by squad group creation. */
export type CreateSquadGroupError =
  | InvalidSquadGroupName
  | EffectSquadBuilderPersistenceUnavailable;

/** Service module for creating personal squad groups. */
export class CreateSquadGroup {
  /** Create an empty private squad group owned by the actor. */
  readonly create = Effect.fn("SquadGroups.create")(function* createSquadGroup(
    input: CreateSquadGroupInput
  ) {
    const name = parseSquadGroupName(input.name);

    if (isError(name)) {
      return yield* name.error;
    }

    return yield* EffectSquadGroupStore.use((store) =>
      store.createSquadGroup({
        actorUserId: input.actorUserId,
        name: name.value,
      })
    );
  });
}

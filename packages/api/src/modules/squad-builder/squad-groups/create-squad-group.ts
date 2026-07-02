import * as Effect from "effect/Effect";

import type { AppUserId } from "../app-user-id.js";
import { isError } from "../result.js";
import { parseSquadGroupName } from "../squad-name.js";
import type { InvalidSquadGroupName } from "../squad-name.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";
import type { SquadGroupSummary } from "./squad-group-store.js";

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
  private readonly serviceName = "CreateSquadGroup";

  /** Create an empty private squad group owned by the actor. */
  readonly create = (
    input: CreateSquadGroupInput
  ): Effect.Effect<
    SquadGroupSummary,
    CreateSquadGroupError,
    EffectSquadGroupStore
  > => {
    void this.serviceName;

    const name = parseSquadGroupName(input.name);

    if (isError(name)) {
      return Effect.fail(name.error);
    }

    return EffectSquadGroupStore.use((store) =>
      store.createSquadGroup({
        actorUserId: input.actorUserId,
        name: name.value,
      })
    );
  };
}

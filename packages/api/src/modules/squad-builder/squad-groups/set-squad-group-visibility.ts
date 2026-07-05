import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import { systemClock } from "../account-import/preview-margonem-profile-import.js";
import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type {
  InvalidSquadGroupVisibility,
  SquadGroupVisibility,
} from "../squad-group-visibility.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import type {
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  SquadGroupNotFound,
} from "./squad-group-store.js";
import { SquadGroupStoreService } from "./squad-group-store.js";

/** Expected failures for global squad visibility operations. */
export type GlobalSquadVisibilityError =
  | SquadGroupNotFound
  | ActorDoesNotOwnSquadGroup
  | ActorCannotViewSquadGroup
  | InvalidSquadGroupVisibility
  | EffectSquadBuilderPersistenceUnavailable;

/** Service module for owner-only squad group visibility changes. */
export class SetSquadGroupVisibility {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Change squad group visibility as the owner. */
  readonly set = Effect.fn("SquadGroups.setVisibility")(
    function setSquadGroupVisibility(
      this: SetSquadGroupVisibility,
      input: {
        readonly actorUserId: AppUserId;
        readonly groupId: SquadGroupId;
        readonly visibility: SquadGroupVisibility;
      }
    ) {
      return SquadGroupStoreService.use((store) =>
        store.setSquadGroupVisibility({
          actorUserId: input.actorUserId,
          groupId: input.groupId,
          now: this.clock.now(),
          visibility: input.visibility,
        })
      );
    }
  );
}

export interface Interface {
  readonly set: SetSquadGroupVisibility["set"];
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/SetSquadGroupVisibilityService"
) {}

export const use = serviceUse(Service);

export const layer = Layer.sync(Service, () => {
  const service = new SetSquadGroupVisibility(systemClock);
  return { set: service.set };
});

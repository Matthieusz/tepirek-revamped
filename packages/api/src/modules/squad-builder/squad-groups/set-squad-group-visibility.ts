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

const makeSet = (clock: Clock) =>
  Effect.fn("SquadGroups.setVisibility")(
    (input: {
      readonly actorUserId: AppUserId;
      readonly groupId: SquadGroupId;
      readonly visibility: SquadGroupVisibility;
    }) =>
      SquadGroupStoreService.use((store) =>
        store.setSquadGroupVisibility({
          actorUserId: input.actorUserId,
          groupId: input.groupId,
          now: clock.now(),
          visibility: input.visibility,
        })
      )
  );

/** Change squad group visibility as the owner. */
export const set = makeSet(systemClock);

export interface Interface {
  readonly set: typeof set;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/SetSquadGroupVisibilityService"
) {}

export const use = serviceUse(Service);

export const layer = Layer.succeed(Service, { set });

import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.js";
import type {
  InvalidSquadGroupVisibility,
  SquadGroupVisibility,
} from "../../../domain/squad-builder/squad-group-visibility.js";
import { systemClock } from "../account-import/preview-margonem-profile-import.js";
import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import * as SquadGroupStore from "./squad-group-store.js";

/** Expected failures for global squad visibility operations. */
export type GlobalSquadVisibilityError =
  | SquadGroupStore.SquadGroupNotFound
  | SquadGroupStore.ActorDoesNotOwnSquadGroup
  | SquadGroupStore.ActorCannotViewSquadGroup
  | InvalidSquadGroupVisibility
  | EffectSquadBuilderPersistenceUnavailable;

const makeSet = (
  store: SquadGroupStore.SquadGroupStoreServiceShape,
  clock: Clock
) =>
  Effect.fn("SquadGroups.setVisibility")(
    (input: {
      readonly actorUserId: AppUserId;
      readonly groupId: SquadGroupId;
      readonly visibility: SquadGroupVisibility;
    }) =>
      store.setSquadGroupVisibility({
        actorUserId: input.actorUserId,
        groupId: input.groupId,
        now: clock.now(),
        visibility: input.visibility,
      })
  );

/** Change squad group visibility as the owner. */
export const set = Effect.fn("SquadGroups.setVisibility")(
  function* setSquadGroupVisibility(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly visibility: SquadGroupVisibility;
  }) {
    const store = yield* SquadGroupStore.SquadGroupStoreService;
    return yield* makeSet(store, systemClock)(input);
  }
);

export interface Interface {
  readonly set: ReturnType<typeof makeSet>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/SetSquadGroupVisibilityService"
) {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* layer() {
    const store = yield* SquadGroupStore.SquadGroupStoreService;
    return { set: makeSet(store, systemClock) };
  })
);

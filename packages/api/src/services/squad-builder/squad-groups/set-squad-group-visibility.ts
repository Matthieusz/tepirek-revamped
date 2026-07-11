import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.js";
import type {
  InvalidSquadGroupVisibility,
  SquadGroupVisibility,
} from "../../../domain/squad-builder/squad-group-visibility.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import * as SquadGroupStore from "./squad-group-store.js";

/** Expected failures for global squad visibility operations. */
export type GlobalSquadVisibilityError =
  | SquadGroupStore.SquadGroupNotFound
  | SquadGroupStore.ActorDoesNotOwnSquadGroup
  | SquadGroupStore.ActorCannotViewSquadGroup
  | InvalidSquadGroupVisibility
  | EffectSquadBuilderPersistenceUnavailable;

const makeSet = (store: SquadGroupStore.SquadGroupStoreServiceShape) =>
  Effect.fn("SquadGroups.setVisibility")(function* setVisibility(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly visibility: SquadGroupVisibility;
  }) {
    const now = new Date(yield* Clock.currentTimeMillis);
    return yield* store.setSquadGroupVisibility({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
      now,
      visibility: input.visibility,
    });
  });

/** Change squad group visibility as the owner. */
export const set = Effect.fn("SquadGroups.setVisibility")(
  function* setSquadGroupVisibility(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly visibility: SquadGroupVisibility;
  }) {
    const store = yield* SquadGroupStore.SquadGroupStoreService;
    return yield* makeSet(store)(input);
  }
);

export interface SetSquadGroupVisibility {
  readonly set: ReturnType<typeof makeSet>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class SetSquadGroupVisibilityService extends Context.Service<
  SetSquadGroupVisibilityService,
  SetSquadGroupVisibility
>()("@tepirek-revamped/api/squad-builder/SetSquadGroupVisibilityService") {}

export const layer = Layer.effect(
  SetSquadGroupVisibilityService,
  Effect.gen(function* layer() {
    const store = yield* SquadGroupStore.SquadGroupStoreService;
    return { set: makeSet(store) };
  })
);

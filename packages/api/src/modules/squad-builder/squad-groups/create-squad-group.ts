import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import { parseSquadGroupName } from "../../../domain/squad-builder/squad-name.js";
import type { InvalidSquadGroupName } from "../../../domain/squad-builder/squad-name.js";
import { serviceUse } from "../../../effect/service-use.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import { SquadGroupStoreService } from "./squad-group-store.js";
import type { SquadGroupStoreServiceShape } from "./squad-group-store.js";

/** Input for creating an empty squad group. */
export interface CreateSquadGroupInput {
  readonly actorUserId: AppUserId;
  readonly name: string;
}

/** Expected failures returned by squad group creation. */
export type CreateSquadGroupError =
  | InvalidSquadGroupName
  | EffectSquadBuilderPersistenceUnavailable;

/** Create an empty private squad group owned by the actor. */
const makeCreate = (store: SquadGroupStoreServiceShape) =>
  Effect.fn("SquadGroups.create")(function* createSquadGroup(
    input: CreateSquadGroupInput
  ) {
    const name = yield* parseSquadGroupName(input.name);

    return yield* store.createSquadGroup({
      actorUserId: input.actorUserId,
      name,
    });
  });

/** Create an empty private squad group owned by the actor. */
export const create = Effect.fn("SquadGroups.create")(
  function* createSquadGroup(input: CreateSquadGroupInput) {
    const store = yield* SquadGroupStoreService;
    return yield* makeCreate(store)(input);
  }
);

export interface Interface {
  readonly create: ReturnType<typeof makeCreate>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/CreateSquadGroupService"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  Effect.gen(function* layer() {
    const store = yield* SquadGroupStoreService;
    return { create: makeCreate(store) };
  })
);

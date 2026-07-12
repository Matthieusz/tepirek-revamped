import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseSquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import type { InvalidSquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";
import type { SquadGroupStoreServiceShape } from "./squad-group-store.ts";

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

export interface CreateSquadGroup {
  readonly create: ReturnType<typeof makeCreate>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class CreateSquadGroupService extends Context.Service<
  CreateSquadGroupService,
  CreateSquadGroup
>()("@tepirek-revamped/api/squad-builder/CreateSquadGroupService") {}

export const layer = Layer.effect(
  CreateSquadGroupService,
  Effect.gen(function* layer() {
    const store = yield* SquadGroupStoreService;
    return { create: makeCreate(store) };
  })
);

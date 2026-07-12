import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type {
  SaveSquadInput,
  SquadGroupValidationError,
} from "../../../domain/squad-builder/squad-group-snapshot.ts";
import { validateSquadGroupSnapshot } from "../../../domain/squad-builder/squad-group-snapshot.ts";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.ts";
import * as SquadGroupStore from "./squad-group-store.ts";

export type { SaveSquadInput };

/** Input for saving a full squad group snapshot. */
export interface SaveSquadGroupInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly name: string;
  readonly squads: readonly SaveSquadInput[];
}

/** Expected failures returned by squad group snapshot save. */
export type SaveSquadGroupError =
  | SquadGroupStore.SquadGroupNotFound
  | SquadGroupStore.ActorCannotViewSquadGroup
  | SquadGroupStore.ActorDoesNotOwnSquadGroup
  | SquadGroupValidationError
  | EffectSquadBuilderPersistenceUnavailable;

const makeSave = (store: SquadGroupStore.SquadGroupStoreServiceShape) =>
  Effect.fn("SquadGroups.save")(function* saveSquadGroup(
    input: SaveSquadGroupInput
  ) {
    yield* store.getSquadGroupDetail({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
    });

    const availableCharacters = yield* store.listAvailableCharactersForOwner({
      ownerUserId: input.actorUserId,
    });

    const snapshot = yield* validateSquadGroupSnapshot({
      actorUserId: input.actorUserId,
      availableCharacters,
      groupId: input.groupId,
      name: input.name,
      squads: input.squads,
    });

    const now = new Date(yield* Clock.currentTimeMillis);
    return yield* store.saveSquadGroupSnapshot({
      actorUserId: input.actorUserId,
      availableCharacters,
      now,
      snapshot,
    });
  });

export const save = Effect.fn("SquadGroups.save")(function* saveSquadGroup(
  input: SaveSquadGroupInput
) {
  const store = yield* SquadGroupStore.SquadGroupStoreService;
  return yield* makeSave(store)(input);
});

export interface SaveSquadGroup {
  readonly save: ReturnType<typeof makeSave>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class SaveSquadGroupService extends Context.Service<
  SaveSquadGroupService,
  SaveSquadGroup
>()("@tepirek-revamped/api/squad-builder/SaveSquadGroupService") {}

export const layer = Layer.effect(
  SaveSquadGroupService,
  Effect.gen(function* layer() {
    const store = yield* SquadGroupStore.SquadGroupStoreService;
    return { save: makeSave(store) };
  })
);

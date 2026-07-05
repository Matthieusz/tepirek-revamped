import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import { systemClock } from "../account-import/preview-margonem-profile-import.js";
import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import { isFailure } from "../outcome.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type {
  SaveSquadInput,
  SquadGroupValidationError,
} from "../squad-group-snapshot.js";
import { validateSquadGroupSnapshot } from "../squad-group-snapshot.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import type {
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  SquadGroupNotFound,
} from "./squad-group-store.js";
import { SquadGroupStoreService } from "./squad-group-store.js";

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
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | ActorDoesNotOwnSquadGroup
  | SquadGroupValidationError
  | EffectSquadBuilderPersistenceUnavailable;

const makeSave = (clock: Clock) =>
  Effect.fn("SquadGroups.save")(function* saveSquadGroup(
    input: SaveSquadGroupInput
  ) {
    yield* SquadGroupStoreService.use((store) =>
      store.getSquadGroupDetail({
        actorUserId: input.actorUserId,
        groupId: input.groupId,
      })
    );

    const availableCharacters = yield* SquadGroupStoreService.use((store) =>
      store.listAvailableCharactersForOwner({
        ownerUserId: input.actorUserId,
      })
    );

    const snapshot = validateSquadGroupSnapshot({
      actorUserId: input.actorUserId,
      availableCharacters,
      groupId: input.groupId,
      name: input.name,
      squads: input.squads,
    });

    if (isFailure(snapshot)) {
      return yield* Effect.fail(snapshot.error);
    }

    return yield* SquadGroupStoreService.use((store) =>
      store.saveSquadGroupSnapshot({
        actorUserId: input.actorUserId,
        availableCharacters,
        now: clock.now(),
        snapshot: snapshot.value,
      })
    );
  });

/** Validate and atomically save a full squad group snapshot. */
export const save = makeSave(systemClock);

export interface Interface {
  readonly save: typeof save;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/SaveSquadGroupService"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  Effect.gen(function* layer() {
    yield* SquadGroupStoreService;
    return { save };
  })
);

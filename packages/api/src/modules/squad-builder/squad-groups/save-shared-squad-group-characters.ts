import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import { systemClock } from "../account-import/preview-margonem-profile-import.js";
import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type {
  SquadCharacterDraftPlacement,
  SquadGroupValidationError,
} from "../squad-group-snapshot.js";
import { validateSquadGroupSnapshot } from "../squad-group-snapshot.js";
import type { SquadId } from "../squad-id.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import {
  ActorCannotEditSquadGroup,
  EditorCannotChangeSquadStructure,
  SquadNotInGroup,
} from "./squad-group-errors.js";
import type {
  ActorCannotViewSquadGroup,
  SquadBuilderPersistenceUnavailable,
  SquadGroupNotFound,
} from "./squad-group-store.js";
import { SquadGroupStoreService } from "./squad-group-store.js";

export interface SharedSquadCharactersInput {
  readonly squadId: SquadId;
  readonly characters: readonly {
    readonly characterId: number;
    readonly position: number;
  }[];
}

export interface SaveSharedSquadGroupCharactersInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly squads: readonly SharedSquadCharactersInput[];
}

export interface SharedSquadGroupCharactersSnapshot {
  readonly groupId: SquadGroupId;
  readonly squads: readonly {
    readonly squadId: SquadId;
    readonly characters: readonly SquadCharacterDraftPlacement[];
  }[];
}

export type EffectSharedSquadGroupSaveError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | ActorCannotEditSquadGroup
  | SquadNotInGroup
  | EditorCannotChangeSquadStructure
  | SquadGroupValidationError
  | EffectSquadBuilderPersistenceUnavailable;

export type SharedSquadGroupSaveError =
  | SquadGroupNotFound
  | { readonly _tag: "SquadGroupNotFound" }
  | ActorCannotViewSquadGroup
  | { readonly _tag: "ActorCannotViewSquadGroup" }
  | ActorCannotEditSquadGroup
  | { readonly _tag: "ActorCannotEditSquadGroup" }
  | SquadNotInGroup
  | { readonly _tag: "SquadNotInGroup"; readonly squadId: SquadId }
  | EditorCannotChangeSquadStructure
  | { readonly _tag: "EditorCannotChangeSquadStructure" }
  | {
      readonly _tag: "SquadCharacterNotAccessible";
      readonly characterId: number;
    }
  | SquadGroupValidationError
  | SquadBuilderPersistenceUnavailable;

const makeSaveWithStoreService = (clock: Clock) =>
  Effect.fn("SquadGroups.saveSharedCharacters")(
    function* saveSharedSquadGroupCharacters(
      input: SaveSharedSquadGroupCharactersInput
    ) {
      const detail = yield* SquadGroupStoreService.use((store) =>
        store.getSquadGroupDetail({
          actorUserId: input.actorUserId,
          groupId: input.groupId,
        })
      );

      if (detail.accessRole === "viewer") {
        return yield* new ActorCannotEditSquadGroup();
      }

      const existingSquadIds = new Set<number>();
      for (const squad of detail.squads) {
        existingSquadIds.add(squad.squadId);
      }

      if (input.squads.length !== detail.squads.length) {
        return yield* new EditorCannotChangeSquadStructure();
      }

      for (const submitted of input.squads) {
        if (!existingSquadIds.has(submitted.squadId)) {
          return yield* new SquadNotInGroup({ squadId: submitted.squadId });
        }
      }

      const submittedIds = new Set(input.squads.map((squad) => squad.squadId));
      if (submittedIds.size !== existingSquadIds.size) {
        return yield* new EditorCannotChangeSquadStructure();
      }

      const availableCharacters = yield* SquadGroupStoreService.use((store) =>
        store.listAvailableCharactersForOwner({
          ownerUserId: detail.ownerUserId,
        })
      );

      const submittedBySquadId = new Map<number, SharedSquadCharactersInput>();
      for (const submitted of input.squads) {
        submittedBySquadId.set(submitted.squadId, submitted);
      }

      const validation = yield* validateSquadGroupSnapshot({
        actorUserId: detail.ownerUserId,
        availableCharacters,
        groupId: input.groupId,
        name: detail.name,
        squads: detail.squads.map((squad) => ({
          characters: submittedBySquadId.get(squad.squadId)?.characters ?? [],
          clientKey: `squad-${squad.squadId}`,
          name: squad.name,
          position: squad.position,
          squadId: squad.squadId,
        })),
      });

      return yield* SquadGroupStoreService.use((store) =>
        store.saveSharedSquadGroupCharacters({
          actorUserId: input.actorUserId,
          groupId: input.groupId,
          now: clock.now(),
          snapshot: {
            groupId: input.groupId,
            squads: validation.squads.map((squad) => ({
              characters: squad.characters,
              squadId: squad.squadId as SquadId,
            })),
          },
        })
      );
    }
  );

/** Save character placements in existing squads as owner or accepted editor. */
export const saveWithStoreService = makeSaveWithStoreService(systemClock);

export interface Interface {
  readonly saveWithStoreService: typeof saveWithStoreService;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/SaveSharedSquadGroupCharactersService"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  Effect.gen(function* layer() {
    yield* SquadGroupStoreService;
    return { saveWithStoreService };
  })
);

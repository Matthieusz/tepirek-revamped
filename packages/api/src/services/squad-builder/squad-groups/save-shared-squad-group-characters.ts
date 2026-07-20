import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type {
  SquadCharacterDraftPlacement,
  SquadGroupValidationError,
} from "../../../domain/squad-builder/squad-group-snapshot.ts";
import { validateSquadGroupSnapshot } from "../../../domain/squad-builder/squad-group-snapshot.ts";
import type { SquadId } from "../../../domain/squad-builder/squad-id.ts";
import type { SquadBuilderPersistenceUnavailable } from "../account-import/account-import-store.ts";
import {
  ActorCannotEditSquadGroup,
  EditorCannotChangeSquadStructure,
  SquadNotInGroup,
} from "./squad-group-errors.ts";
import type {
  EffectSquadBuilderPersistenceUnavailable,
  SquadCharacterNotAccessible,
  SquadGroupWriteConflict,
} from "./squad-group-errors.ts";
import type {
  ActorCannotViewSquadGroup,
  SquadGroupNotFound,
} from "./squad-group-store.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

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
  readonly expectedUpdatedAt: Date;
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
  | SquadGroupWriteConflict
  | SquadGroupValidationError
  | EffectSquadBuilderPersistenceUnavailable;

export type SharedSquadGroupSaveError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | ActorCannotEditSquadGroup
  | SquadNotInGroup
  | EditorCannotChangeSquadStructure
  | SquadCharacterNotAccessible
  | SquadGroupValidationError
  | SquadBuilderPersistenceUnavailable;

const makeSave = (store: typeof SquadGroupStoreService.Service) =>
  Effect.fn("SquadGroups.saveSharedCharacters")(
    function* saveSharedSquadGroupCharacters(
      input: SaveSharedSquadGroupCharactersInput
    ) {
      const detail = yield* store.getSquadGroupDetail({
        actorUserId: input.actorUserId,
        groupId: input.groupId,
      });

      if (detail.accessRole === "viewer") {
        return yield* new ActorCannotEditSquadGroup();
      }

      const existingSquadIds = HashSet.fromIterable(
        detail.squads.map((squad) => squad.squadId)
      );

      if (input.squads.length !== detail.squads.length) {
        return yield* new EditorCannotChangeSquadStructure();
      }

      for (const submitted of input.squads) {
        if (!HashSet.has(existingSquadIds, submitted.squadId)) {
          return yield* new SquadNotInGroup({ squadId: submitted.squadId });
        }
      }

      const submittedIds = HashSet.fromIterable(
        input.squads.map((squad) => squad.squadId)
      );
      if (HashSet.size(submittedIds) !== HashSet.size(existingSquadIds)) {
        return yield* new EditorCannotChangeSquadStructure();
      }

      const availableCharacters = yield* store.listAvailableCharactersForOwner({
        ownerUserId: detail.ownerUserId,
      });

      const submittedBySquadId = HashMap.fromIterable(
        input.squads.map((submitted) => [submitted.squadId, submitted] as const)
      );

      const validation = yield* validateSquadGroupSnapshot({
        actorUserId: detail.ownerUserId,
        availableCharacters,
        groupId: input.groupId,
        name: detail.name,
        squads: detail.squads.map((squad) => ({
          characters: HashMap.get(submittedBySquadId, squad.squadId).pipe(
            Option.map((submitted) => submitted.characters),
            Option.getOrElse(() => [])
          ),
          clientKey: `squad-${squad.squadId}`,
          name: squad.name,
          position: squad.position,
          squadId: squad.squadId,
        })),
      });

      const snapshotSquads: SharedSquadGroupCharactersSnapshot["squads"][number][] =
        [];
      for (const squad of validation.squads) {
        if (squad.squadId === undefined) {
          return yield* new EditorCannotChangeSquadStructure();
        }
        snapshotSquads.push({
          characters: squad.characters,
          squadId: squad.squadId,
        });
      }

      const now = new Date(yield* Clock.currentTimeMillis);
      return yield* store.saveSharedSquadGroupCharacters({
        actorUserId: input.actorUserId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        groupId: input.groupId,
        now,
        snapshot: {
          groupId: input.groupId,
          squads: snapshotSquads,
        },
      });
    }
  );

/** Integration seam that resolves the store from the Effect context. */
export const saveWithStoreService = (
  input: SaveSharedSquadGroupCharactersInput
) => SquadGroupStoreService.use((store) => makeSave(store)(input));

export interface SaveSharedSquadGroupCharacters {
  readonly saveWithStoreService: ReturnType<typeof makeSave>;
}

// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class SaveSharedSquadGroupCharactersService extends Context.Service<
  SaveSharedSquadGroupCharactersService,
  SaveSharedSquadGroupCharacters
>()(
  "@tepirek-revamped/api/squad-builder/SaveSharedSquadGroupCharactersService"
) {}

export const layer = Layer.effect(
  SaveSharedSquadGroupCharactersService,
  Effect.gen(function* layer() {
    const store = yield* SquadGroupStoreService;
    return SaveSharedSquadGroupCharactersService.of({
      saveWithStoreService: makeSave(store),
    });
  })
);

import * as Effect from "effect/Effect";

import type { Clock } from "../account-import/preview-margonem-profile-import.js";
import type { AppUserId } from "../app-user-id.js";
import { err, isError, ok } from "../result.js";
import type { Result } from "../result.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type {
  SquadCharacterDraftPlacement,
  SquadGroupValidationError,
} from "../squad-group-snapshot.js";
import { validateSquadGroupSnapshot } from "../squad-group-snapshot.js";
import type { SquadId } from "../squad-id.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import type {
  ActorCannotViewSquadGroup,
  SquadBuilderPersistenceUnavailable,
  SquadGroupDetail,
  SquadGroupNotFound,
  SquadGroupSharingStore,
  SquadGroupStore,
} from "./squad-group-store.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";

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

export type SharedSquadGroupSaveError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | { readonly _tag: "ActorCannotEditSquadGroup" }
  | { readonly _tag: "SquadNotInGroup"; readonly squadId: SquadId }
  | { readonly _tag: "EditorCannotChangeSquadStructure" }
  | SquadGroupValidationError
  | SquadBuilderPersistenceUnavailable;

export type EffectSharedSquadGroupSaveError =
  | SquadGroupNotFound
  | ActorCannotViewSquadGroup
  | { readonly _tag: "ActorCannotEditSquadGroup" }
  | { readonly _tag: "SquadNotInGroup"; readonly squadId: SquadId }
  | { readonly _tag: "EditorCannotChangeSquadStructure" }
  | SquadGroupValidationError
  | EffectSquadBuilderPersistenceUnavailable;

/** Save character placements in existing squads as owner or accepted editor. */
export class SaveSharedSquadGroupCharacters {
  private readonly sharingStore: SquadGroupSharingStore | undefined;
  private readonly squadStore:
    | Pick<
        SquadGroupStore,
        "getSquadGroupDetail" | "listAvailableCharactersForOwner"
      >
    | undefined;
  private readonly clock: Clock;

  constructor(
    sharingStore: SquadGroupSharingStore | undefined,
    squadStore:
      | Pick<
          SquadGroupStore,
          "getSquadGroupDetail" | "listAvailableCharactersForOwner"
        >
      | undefined,
    clock: Clock
  ) {
    this.sharingStore = sharingStore;
    this.squadStore = squadStore;
    this.clock = clock;
  }

  async save(
    input: SaveSharedSquadGroupCharactersInput
  ): Promise<Result<SquadGroupDetail, SharedSquadGroupSaveError>> {
    if (this.sharingStore === undefined || this.squadStore === undefined) {
      throw new Error(
        "Legacy save requires sharing and squad stores; use saveEffect for Effect runtime"
      );
    }

    const access = await this.sharingStore.authorizeSquadGroupEditor({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
    });

    if (isError(access)) {
      return err(access.error);
    }

    const detail = await this.squadStore.getSquadGroupDetail({
      actorUserId: access.value.ownerUserId,
      groupId: input.groupId,
    });

    if (isError(detail)) {
      return err(detail.error);
    }

    const existingSquadIds = new Set<number>();
    for (const squad of detail.value.squads) {
      existingSquadIds.add(squad.squadId);
    }

    if (input.squads.length !== detail.value.squads.length) {
      return err({ _tag: "EditorCannotChangeSquadStructure" });
    }

    for (const submitted of input.squads) {
      if (!existingSquadIds.has(submitted.squadId)) {
        return err({ _tag: "SquadNotInGroup", squadId: submitted.squadId });
      }
    }

    const submittedIds = new Set(input.squads.map((squad) => squad.squadId));
    if (submittedIds.size !== existingSquadIds.size) {
      return err({ _tag: "EditorCannotChangeSquadStructure" });
    }

    const availableCharacters =
      await this.squadStore.listAvailableCharactersForOwner({
        ownerUserId: access.value.ownerUserId,
      });

    if (isError(availableCharacters)) {
      return err(availableCharacters.error);
    }

    const submittedBySquadId = new Map<number, SharedSquadCharactersInput>();
    for (const submitted of input.squads) {
      submittedBySquadId.set(submitted.squadId, submitted);
    }

    const validation = validateSquadGroupSnapshot({
      actorUserId: access.value.ownerUserId,
      availableCharacters: availableCharacters.value,
      groupId: input.groupId,
      name: detail.value.name,
      squads: detail.value.squads.map((squad) => ({
        characters: submittedBySquadId.get(squad.squadId)?.characters ?? [],
        clientKey: `squad-${squad.squadId}`,
        name: squad.name,
        position: squad.position,
        squadId: squad.squadId,
      })),
    });

    if (isError(validation)) {
      return err(validation.error);
    }

    const result = await this.sharingStore.saveSharedSquadGroupCharacters({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
      now: this.clock.now(),
      snapshot: {
        groupId: input.groupId,
        squads: validation.value.squads.map((squad) => ({
          characters: squad.characters,
          squadId: squad.squadId as SquadId,
        })),
      },
    });

    if (isError(result)) {
      return err(result.error);
    }

    return ok(result.value);
  }

  saveEffect(
    input: SaveSharedSquadGroupCharactersInput
  ): Effect.Effect<
    SquadGroupDetail,
    EffectSharedSquadGroupSaveError,
    EffectSquadGroupStore
  > {
    const { clock } = this;

    return Effect.gen(function* saveSharedSquadGroupCharactersEffect() {
      const detail = yield* EffectSquadGroupStore.use((store) =>
        store.getSquadGroupDetail({
          actorUserId: input.actorUserId,
          groupId: input.groupId,
        })
      );

      if (detail.accessRole === "viewer") {
        return yield* Effect.fail({
          _tag: "ActorCannotEditSquadGroup" as const,
        });
      }

      const existingSquadIds = new Set<number>();
      for (const squad of detail.squads) {
        existingSquadIds.add(squad.squadId);
      }

      if (input.squads.length !== detail.squads.length) {
        return yield* Effect.fail({
          _tag: "EditorCannotChangeSquadStructure" as const,
        });
      }

      for (const submitted of input.squads) {
        if (!existingSquadIds.has(submitted.squadId)) {
          return yield* Effect.fail({
            _tag: "SquadNotInGroup" as const,
            squadId: submitted.squadId,
          });
        }
      }

      const submittedIds = new Set(input.squads.map((squad) => squad.squadId));
      if (submittedIds.size !== existingSquadIds.size) {
        return yield* Effect.fail({
          _tag: "EditorCannotChangeSquadStructure" as const,
        });
      }

      const availableCharacters = yield* EffectSquadGroupStore.use((store) =>
        store.listAvailableCharactersForOwner({
          ownerUserId: detail.ownerUserId,
        })
      );

      const submittedBySquadId = new Map<number, SharedSquadCharactersInput>();
      for (const submitted of input.squads) {
        submittedBySquadId.set(submitted.squadId, submitted);
      }

      const validation = validateSquadGroupSnapshot({
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

      if (isError(validation)) {
        return yield* Effect.fail(validation.error);
      }

      return yield* EffectSquadGroupStore.use((store) =>
        store.saveSharedSquadGroupCharacters({
          actorUserId: input.actorUserId,
          groupId: input.groupId,
          now: clock.now(),
          snapshot: {
            groupId: input.groupId,
            squads: validation.value.squads.map((squad) => ({
              characters: squad.characters,
              squadId: squad.squadId as SquadId,
            })),
          },
        })
      );
    });
  }
}

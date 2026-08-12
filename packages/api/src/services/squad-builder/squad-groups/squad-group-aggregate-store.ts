import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { AccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type { MargonemProfession } from "../../../domain/squad-builder/margonem-character.ts";
import type { SquadGroupAccessRole } from "../../../domain/squad-builder/squad-group-access.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type {
  SquadGroupDraftSnapshot,
  SquadGroupValidationError,
} from "../../../domain/squad-builder/squad-group-snapshot.ts";
import type { SquadGroupVisibility } from "../../../domain/squad-builder/squad-group-visibility.ts";
import type { SquadId } from "../../../domain/squad-builder/squad-id.ts";
import type { SquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import type {
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  SquadBuilderPersistenceUnavailable,
  SquadGroupNotFound,
  SquadGroupWriteConflict,
  SquadNotInGroup,
} from "./squad-group-errors.ts";

/** Summary row for a squad group list. */
export interface SquadGroupSummary {
  readonly groupId: SquadGroupId;
  readonly name: SquadGroupName;
  readonly squadCount: number;
  readonly characterCount: number;
  readonly updatedAt: Date;
}

/** Character placement shown in a saved squad group detail. */
export interface SquadGroupCharacter {
  readonly placementId: number;
  readonly characterId: number;
  readonly margonemCharacterId: number;
  readonly accountId: MargonemAccountId;
  readonly accountDisplayName: AccountDisplayName;
  readonly accountOwnerUserName: string;
  readonly accountOwnerUserImage: string | null;
  readonly name: string;
  readonly level: number;
  readonly profession: MargonemProfession;
  readonly avatarUrl: string | null;
  readonly position: number;
}

/** Saved squad shown in a squad group detail. */
interface SquadDetail {
  readonly squadId: SquadId;
  readonly name: string;
  readonly position: number;
  readonly characters: readonly SquadGroupCharacter[];
}

/** Full saved squad group detail. */
interface SquadGroupDetail {
  readonly accessRole: SquadGroupAccessRole;
  readonly groupId: SquadGroupId;
  readonly name: string;
  readonly ownerUserId: AppUserId;
  readonly visibility: SquadGroupVisibility;
  readonly updatedAt: Date;
  readonly squads: readonly SquadDetail[];
}

/** Store input for creating a squad group. */
export interface CreateSquadGroupStoreInput {
  readonly actorUserId: AppUserId;
  readonly name: SquadGroupName;
}

/** Store input for permanently deleting an owned squad group. */
export interface DeleteSquadGroupStoreInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}

/** Store input for listing actor-owned squad groups. */
export interface ListMySquadGroupsInput {
  readonly actorUserId: AppUserId;
}

/** Store input for loading a squad group detail. */
export interface GetSquadGroupDetailInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
}

/** Store input for saving a parsed squad group snapshot. */
export interface SaveSquadGroupSnapshotStoreInput {
  readonly actorUserId: AppUserId;
  readonly expectedUpdatedAt: Date;
  readonly snapshot: SquadGroupDraftSnapshot;
  readonly now: Date;
}

/** Store input for changing squad group visibility. */
export interface SetSquadGroupVisibilityStoreInput {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly visibility: SquadGroupVisibility;
  readonly now: Date;
}

/** Result of changing squad group visibility. */
interface SquadGroupVisibilityChange {
  readonly groupId: SquadGroupId;
  readonly visibility: SquadGroupVisibility;
  readonly updatedAt: Date;
}

/** Persistence port for loading and saving the squad-group aggregate. */
export interface SquadGroupAggregateStoreContract {
  readonly createSquadGroup: (
    input: CreateSquadGroupStoreInput
  ) => Effect<SquadGroupSummary, SquadBuilderPersistenceUnavailable>;
  readonly deleteSquadGroup: (
    input: DeleteSquadGroupStoreInput
  ) => Effect<
    void,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadBuilderPersistenceUnavailable
  >;
  readonly listMySquadGroups: (
    input: ListMySquadGroupsInput
  ) => Effect<readonly SquadGroupSummary[], SquadBuilderPersistenceUnavailable>;
  readonly getSquadGroupDetail: (
    input: GetSquadGroupDetailInput
  ) => Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorCannotViewSquadGroup
    | SquadBuilderPersistenceUnavailable
  >;
  readonly saveSquadGroupSnapshot: (
    input: SaveSquadGroupSnapshotStoreInput
  ) => Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadGroupWriteConflict
    | SquadNotInGroup
    | SquadGroupValidationError
    | SquadBuilderPersistenceUnavailable
  >;
  readonly setSquadGroupVisibility: (
    input: SetSquadGroupVisibilityStoreInput
  ) => Effect<
    SquadGroupVisibilityChange,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | SquadBuilderPersistenceUnavailable
  >;
}

/** Load/save access to the squad-group aggregate. */
export class SquadGroupAggregateStoreService extends Context.Service<
  SquadGroupAggregateStoreService,
  SquadGroupAggregateStoreContract
>()("@tepirek-revamped/api/squad-builder/SquadGroupAggregateStoreService") {}

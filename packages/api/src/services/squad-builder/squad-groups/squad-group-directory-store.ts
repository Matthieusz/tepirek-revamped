import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { SquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import type { AvailableSquadCharacter } from "../../../domain/squad-builder/squad-group-snapshot.ts";
import type { SquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import type {
  SquadBuilderPersistenceUnavailable,
  SquadEditorInviteTargetNotFound,
  SquadEditorInviteTargetNotVerified,
} from "./squad-group-errors.ts";

export type { AvailableSquadCharacter };

/** Read model for a squad editor invite search result. */
export interface SquadEditorInviteTarget {
  readonly userId: AppUserId;
  readonly name: string;
  readonly image: string | null;
}

/** Summary row for a globally visible squad group. */
export interface GlobalSquadGroupSummary {
  readonly groupId: SquadGroupId;
  readonly name: SquadGroupName;
  readonly ownerUserId: AppUserId;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly squadCount: number;
  readonly characterCount: number;
  readonly updatedAt: Date;
}

/** Store input for listing global squad groups. */
export interface ListGlobalSquadGroupsInput {
  readonly actorUserId: AppUserId;
  readonly filters: SquadGroupListFilters;
  readonly limit: number;
}

/** Store input for listing characters available to a group owner. */
export interface ListAvailableCharactersForOwnerInput {
  readonly ownerUserId: AppUserId;
}

/** Store input for searching squad editor invite targets. */
export interface SearchSquadEditorInviteTargetsStoreInput {
  readonly groupId: SquadGroupId;
  readonly ownerUserId: AppUserId;
  readonly query: string;
  readonly maxResults: number;
}

/** Persistence port for user, character, and global-group discovery. */
export interface SquadGroupDirectoryStoreContract {
  readonly listAvailableCharactersForOwner: (
    input: ListAvailableCharactersForOwnerInput
  ) => Effect<
    readonly AvailableSquadCharacter[],
    SquadBuilderPersistenceUnavailable
  >;
  readonly listGlobalSquadGroups: (
    input: ListGlobalSquadGroupsInput
  ) => Effect<
    readonly GlobalSquadGroupSummary[],
    SquadBuilderPersistenceUnavailable
  >;
  readonly searchSquadEditorInviteTargets: (
    input: SearchSquadEditorInviteTargetsStoreInput
  ) => Effect<
    readonly SquadEditorInviteTarget[],
    SquadBuilderPersistenceUnavailable
  >;
  readonly findVerifiedSquadEditorInviteTarget: (input: {
    readonly targetUserId: AppUserId;
  }) => Effect<
    SquadEditorInviteTarget,
    | SquadEditorInviteTargetNotFound
    | SquadEditorInviteTargetNotVerified
    | SquadBuilderPersistenceUnavailable
  >;
}

/** Discovery access for users, characters, and globally visible groups. */
export class SquadGroupDirectoryStoreService extends Context.Service<
  SquadGroupDirectoryStoreService,
  SquadGroupDirectoryStoreContract
>()("@tepirek-revamped/api/squad-builder/SquadGroupDirectoryStoreService") {}

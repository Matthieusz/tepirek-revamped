import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type {
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  AuthorizeSquadGroupViewerInput,
  CreateSquadGroupStoreInput,
  GetSquadGroupDetailInput,
  GlobalSquadGroupSummary,
  GlobalSquadVisibilityStore,
  ListAvailableCharactersForOwnerInput,
  ListGlobalSquadGroupsInput,
  ListMySquadGroupsInput,
  SaveSharedSquadGroupCharactersStoreInput,
  SaveSquadGroupSnapshotStoreInput,
  SearchSquadEditorInviteTargetsStoreInput,
  SetSquadGroupVisibilityStoreInput,
  SharedSquadGroupSummary,
  SquadBuilderPersistenceUnavailable,
  SquadDetail,
  SquadEditorInviteTarget,
  SquadGroupCharacter,
  SquadGroupDetail,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
  SquadGroupNotFound,
  SquadGroupSharingAuthorizationError,
  SquadGroupSharingStore,
  SquadGroupStore,
  SquadGroupSummary,
  SquadGroupVisibilityChange,
  UpsertSquadGroupEditorInviteInput,
  RespondToSquadGroupInviteStoreInput,
  RevokeSquadGroupEditorStoreInput,
} from "../squad-builder-store";
import type { AvailableSquadCharacter } from "../squad-group-snapshot";
import type { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors";

export interface EffectSquadGroupStoreShape {
  readonly createSquadGroup: (
    input: CreateSquadGroupStoreInput
  ) => Effect<
    SquadGroupSummary,
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
}

export class EffectSquadGroupStore extends Context.Service<
  EffectSquadGroupStore,
  EffectSquadGroupStoreShape
>()("@tepirek-revamped/api/squad-builder/EffectSquadGroupStore") {}

/** Squad group persistence contracts used by group editing, sharing, and visibility services. */
export type SquadGroupsPersistenceStore = SquadGroupStore &
  SquadGroupSharingStore &
  GlobalSquadVisibilityStore;

export type {
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  AuthorizeSquadGroupViewerInput,
  AvailableSquadCharacter,
  CreateSquadGroupStoreInput,
  GetSquadGroupDetailInput,
  GlobalSquadGroupSummary,
  GlobalSquadVisibilityStore,
  ListAvailableCharactersForOwnerInput,
  ListGlobalSquadGroupsInput,
  ListMySquadGroupsInput,
  RespondToSquadGroupInviteStoreInput,
  RevokeSquadGroupEditorStoreInput,
  SaveSharedSquadGroupCharactersStoreInput,
  SaveSquadGroupSnapshotStoreInput,
  SearchSquadEditorInviteTargetsStoreInput,
  SetSquadGroupVisibilityStoreInput,
  SharedSquadGroupSummary,
  SquadBuilderPersistenceUnavailable,
  SquadDetail,
  SquadEditorInviteTarget,
  SquadGroupCharacter,
  SquadGroupDetail,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
  SquadGroupNotFound,
  SquadGroupSharingAuthorizationError,
  SquadGroupSharingStore,
  SquadGroupStore,
  SquadGroupSummary,
  SquadGroupVisibilityChange,
  UpsertSquadGroupEditorInviteInput,
};

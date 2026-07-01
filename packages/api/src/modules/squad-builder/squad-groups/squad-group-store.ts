import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { AppUserId } from "../app-user-id";
import type { MargonemAccountId } from "../margonem-account-id";
import type {
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnMargonemAccount,
  ActorDoesNotOwnSquadGroup,
  AuthorizeSquadGroupViewerInput,
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  CreatePendingMargonemAccountRefetchInput,
  CreateSquadGroupStoreInput,
  DuplicateMargonemAccountError,
  FindPendingMargonemAccountImportInput,
  FindProfileAccessStateInput,
  FirecrawlBudgetError,
  GetSquadGroupDetailInput,
  GlobalSquadGroupSummary,
  GlobalSquadVisibilityStore,
  ListAvailableCharactersForOwnerInput,
  ListGlobalSquadGroupsInput,
  ListMySquadGroupsInput,
  ListOwnedMargonemAccountsInput,
  MargonemAccountNotFound,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  OwnedMargonemAccountSummary,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportForConfirmation,
  PendingMargonemAccountImportNotFound,
  PendingMargonemAccountRefetch,
  ProfileAccessState,
  RefetchableMargonemAccount,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
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
  readonly listMySquadGroups: (
    input: ListMySquadGroupsInput
  ) => Effect<
    readonly SquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly getSquadGroupDetail: (
    input: GetSquadGroupDetailInput
  ) => Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorCannotViewSquadGroup
    | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly listAvailableCharactersForOwner: (
    input: ListAvailableCharactersForOwnerInput
  ) => Effect<
    readonly AvailableSquadCharacter[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly listGlobalSquadGroups: (
    input: ListGlobalSquadGroupsInput
  ) => Effect<
    readonly GlobalSquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly setSquadGroupVisibility: (
    input: SetSquadGroupVisibilityStoreInput
  ) => Effect<
    SquadGroupVisibilityChange,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly listOwnedAccounts: (
    input: ListOwnedMargonemAccountsInput
  ) => Effect<
    readonly OwnedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly findProfileAccessState: (
    input: FindProfileAccessStateInput
  ) => Effect<
    ProfileAccessState,
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly reserveRequest: (
    input: ReserveFirecrawlRequestInput
  ) => Effect<
    ReservedFirecrawlRequest,
    FirecrawlBudgetError | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly createPendingImport: (
    input: CreatePendingMargonemAccountImportInput
  ) => Effect<
    PendingMargonemAccountImport,
    EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly findPendingImportForConfirmation: (
    input: FindPendingMargonemAccountImportInput
  ) => Effect<
    PendingMargonemAccountImportForConfirmation,
    | PendingMargonemAccountImportNotFound
    | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly createOwnedAccountFromPendingImport: (
    input: CreateOwnedAccountFromPendingImportInput
  ) => Effect<
    OwnedMargonemAccountSummary,
    DuplicateMargonemAccountError | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly markRequestSucceeded: (
    input: MarkFirecrawlRequestSucceededInput
  ) => Effect<void, EffectSquadBuilderPersistenceUnavailable, never>;
  readonly markRequestFailed: (
    input: MarkFirecrawlRequestFailedInput
  ) => Effect<void, EffectSquadBuilderPersistenceUnavailable, never>;
  readonly getAccountForRefetch: (input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }) => Effect<
    RefetchableMargonemAccount,
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | EffectSquadBuilderPersistenceUnavailable,
    never
  >;
  readonly createPendingRefetch: (
    input: CreatePendingMargonemAccountRefetchInput
  ) => Effect<
    PendingMargonemAccountRefetch,
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
  ActorDoesNotOwnMargonemAccount,
  ActorDoesNotOwnSquadGroup,
  AuthorizeSquadGroupViewerInput,
  AvailableSquadCharacter,
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  CreatePendingMargonemAccountRefetchInput,
  CreateSquadGroupStoreInput,
  DuplicateMargonemAccountError,
  FindPendingMargonemAccountImportInput,
  FindProfileAccessStateInput,
  FirecrawlBudgetError,
  GetSquadGroupDetailInput,
  GlobalSquadGroupSummary,
  GlobalSquadVisibilityStore,
  ListAvailableCharactersForOwnerInput,
  ListGlobalSquadGroupsInput,
  ListMySquadGroupsInput,
  ListOwnedMargonemAccountsInput,
  MargonemAccountNotFound,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  OwnedMargonemAccountSummary,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportForConfirmation,
  PendingMargonemAccountImportNotFound,
  PendingMargonemAccountRefetch,
  ProfileAccessState,
  RefetchableMargonemAccount,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
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

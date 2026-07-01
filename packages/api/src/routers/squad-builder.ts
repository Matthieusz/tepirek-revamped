import { ORPCError } from "@orpc/server";
import type { Effect } from "effect/Effect";
import type { ManagedRuntime } from "effect/ManagedRuntime";
import * as Schema from "effect/Schema";
import { z } from "zod";

import { makeApiManagedRuntime } from "../effect-app";
import { accountDisplayNameToString } from "../modules/squad-builder/account-display-name";
import { ConfirmOwnedAccountImport } from "../modules/squad-builder/account-import/confirm-owned-account-import";
import type { ConfirmOwnedAccountImportError } from "../modules/squad-builder/account-import/confirm-owned-account-import";
import { EffectConfirmOwnedAccountImport } from "../modules/squad-builder/account-import/effect-confirm-owned-account-import";
import type { EffectConfirmOwnedAccountImportError } from "../modules/squad-builder/account-import/effect-confirm-owned-account-import";
import { EffectPreviewMargonemProfileImport } from "../modules/squad-builder/account-import/effect-preview-margonem-profile-import";
import { EffectPreviewOwnedAccountImports } from "../modules/squad-builder/account-import/effect-preview-owned-account-imports";
import { ListOwnedMargonemAccounts } from "../modules/squad-builder/account-import/list-owned-margonem-accounts";
import type { ListOwnedMargonemAccountsError } from "../modules/squad-builder/account-import/list-owned-margonem-accounts";
import {
  PreviewMargonemProfileImport,
  systemClock,
} from "../modules/squad-builder/account-import/preview-margonem-profile-import";
import type {
  PreviewMargonemProfileImportError,
  PreviewMargonemProfileImportInput,
  PreviewMargonemProfileImportOutput,
} from "../modules/squad-builder/account-import/preview-margonem-profile-import";
import { PreviewOwnedAccountImports } from "../modules/squad-builder/account-import/preview-owned-account-imports";
import type {
  PreviewOwnedAccountImportItem,
  PreviewOwnedAccountImportLineError,
  PreviewOwnedAccountImportsError,
  PreviewOwnedAccountImportsOutput,
} from "../modules/squad-builder/account-import/preview-owned-account-imports";
import { ApplyAccountRefetch } from "../modules/squad-builder/account-refetch/apply-account-refetch";
import type {
  ApplyAccountRefetchError,
  ApplyAccountRefetchOutput,
} from "../modules/squad-builder/account-refetch/apply-account-refetch";
import { EffectApplyAccountRefetch } from "../modules/squad-builder/account-refetch/effect-apply-account-refetch";
import { EffectPreviewAccountRefetch } from "../modules/squad-builder/account-refetch/effect-preview-account-refetch";
import { PreviewAccountRefetch } from "../modules/squad-builder/account-refetch/preview-account-refetch";
import type {
  PreviewAccountRefetchError,
  PreviewAccountRefetchOutput,
} from "../modules/squad-builder/account-refetch/preview-account-refetch";
import type { AccountSharingError } from "../modules/squad-builder/account-sharing/account-sharing-error";
import { EffectRespondToAccountAccessInvite } from "../modules/squad-builder/account-sharing/effect-respond-to-account-access-invite";
import { EffectRevokeAccountAccess } from "../modules/squad-builder/account-sharing/effect-revoke-account-access";
import { EffectSearchAccountInviteTargets } from "../modules/squad-builder/account-sharing/effect-search-account-invite-targets";
import { EffectSendAccountAccessInvite } from "../modules/squad-builder/account-sharing/effect-send-account-access-invite";
import { ListAccountSharingState } from "../modules/squad-builder/account-sharing/list-account-sharing-state";
import { RespondToAccountAccessInvite } from "../modules/squad-builder/account-sharing/respond-to-account-access-invite";
import { RevokeAccountAccess } from "../modules/squad-builder/account-sharing/revoke-account-access";
import { SearchAccountInviteTargets } from "../modules/squad-builder/account-sharing/search-account-invite-targets";
import { SendAccountAccessInvite } from "../modules/squad-builder/account-sharing/send-account-access-invite";
import {
  appUserIdToString,
  parseAppUserId,
} from "../modules/squad-builder/app-user-id";
import type { InvalidAppUserId } from "../modules/squad-builder/app-user-id";
import { FirecrawlSdkClient } from "../modules/squad-builder/firecrawl-client";
import { parseFirecrawlConfig } from "../modules/squad-builder/firecrawl-config";
import type { ParseFirecrawlConfigError } from "../modules/squad-builder/firecrawl-config";
import {
  margonemAccountAccessIdToNumber,
  parseMargonemAccountAccessId,
} from "../modules/squad-builder/margonem-account-access-id";
import {
  margonemAccountIdToNumber,
  parseMargonemAccountId,
} from "../modules/squad-builder/margonem-account-id";
import { profileIdToNumber } from "../modules/squad-builder/margonem-profile-id";
import { parsePendingMargonemAccountImportId } from "../modules/squad-builder/pending-margonem-account-import-id";
import { parsePendingMargonemAccountRefetchId } from "../modules/squad-builder/pending-margonem-account-refetch-id";
import { err, isError, ok } from "../modules/squad-builder/result";
import type { Result } from "../modules/squad-builder/result";
import { DrizzleSquadBuilderStore } from "../modules/squad-builder/squad-builder-store";
import type {
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  AccountInviteTarget,
  GlobalSquadGroupSummary,
  OwnedMargonemAccountSummary,
  RevokeAccountAccessResult,
  SharedMargonemAccountSummary,
  SharedSquadGroupSummary,
  SquadBuilderPersistenceUnavailable,
  SquadEditorInviteTarget,
  SquadGroupDetail,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
  SquadGroupSummary,
  SquadGroupVisibilityChange,
} from "../modules/squad-builder/squad-builder-store";
import { parseSquadGroupId } from "../modules/squad-builder/squad-group-id";
import {
  parseSquadGroupInvitationId,
  squadGroupInvitationIdToNumber,
} from "../modules/squad-builder/squad-group-invitation-id";
import { parseSquadGroupListFilters } from "../modules/squad-builder/squad-group-list-filters";
import type { SquadGroupListFilterError } from "../modules/squad-builder/squad-group-list-filters";
import type { AvailableSquadCharacter } from "../modules/squad-builder/squad-group-snapshot";
import { parseSquadGroupVisibility } from "../modules/squad-builder/squad-group-visibility";
import { CreateSquadGroup } from "../modules/squad-builder/squad-groups/create-squad-group";
import type { CreateSquadGroupError } from "../modules/squad-builder/squad-groups/create-squad-group";
import { ListAvailableSquadCharacters } from "../modules/squad-builder/squad-groups/list-available-squad-characters";
import type { ListAvailableSquadCharactersError } from "../modules/squad-builder/squad-groups/list-available-squad-characters";
import { ListGlobalSquadGroups } from "../modules/squad-builder/squad-groups/list-global-squad-groups";
import { ListSquadGroupSharingState } from "../modules/squad-builder/squad-groups/list-squad-group-sharing-state";
import { ListSquadGroups } from "../modules/squad-builder/squad-groups/list-squad-groups";
import type {
  GetSquadGroupDetailError,
  ListMySquadGroupsError,
} from "../modules/squad-builder/squad-groups/list-squad-groups";
import { RespondToSquadGroupInvite } from "../modules/squad-builder/squad-groups/respond-to-squad-group-invite";
import { RevokeSquadGroupEditor } from "../modules/squad-builder/squad-groups/revoke-squad-group-editor";
import { SaveSharedSquadGroupCharacters } from "../modules/squad-builder/squad-groups/save-shared-squad-group-characters";
import type { SharedSquadGroupSaveError } from "../modules/squad-builder/squad-groups/save-shared-squad-group-characters";
import { SaveSquadGroup } from "../modules/squad-builder/squad-groups/save-squad-group";
import type {
  SaveSquadGroupError,
  SaveSquadInput,
} from "../modules/squad-builder/squad-groups/save-squad-group";
import { SearchSquadEditorInviteTargets } from "../modules/squad-builder/squad-groups/search-squad-editor-invite-targets";
import { SendSquadGroupEditorInvite } from "../modules/squad-builder/squad-groups/send-squad-group-editor-invite";
import { SetSquadGroupVisibility } from "../modules/squad-builder/squad-groups/set-squad-group-visibility";
import type { GlobalSquadVisibilityError } from "../modules/squad-builder/squad-groups/set-squad-group-visibility";
import type { SquadGroupSharingError } from "../modules/squad-builder/squad-groups/squad-group-sharing-error";
import type { EffectSquadGroupStore } from "../modules/squad-builder/squad-groups/squad-group-store";
import { parseSquadId } from "../modules/squad-builder/squad-id";
import { runOrpcEffect } from "../orpc-effect";
import { verifiedProcedure } from "./procedures";
import type { RouterContext } from "./procedures";

const casesHandled = (x: never): never => x;

const strictEffectBoundaryParseOptions = {
  onExcessProperty: "error",
} as const;

interface PreviewProfileImportService {
  readonly preview: (
    input: PreviewMargonemProfileImportInput,
    options?: { readonly signal?: AbortSignal }
  ) => Promise<
    Result<
      PreviewMargonemProfileImportOutput,
      PreviewMargonemProfileImportError
    >
  >;
}

interface EffectPreviewProfileImportService {
  readonly preview: (
    input: PreviewMargonemProfileImportInput,
    options?: { readonly signal?: AbortSignal }
  ) => Effect<
    PreviewMargonemProfileImportOutput,
    PreviewMargonemProfileImportError,
    EffectSquadGroupStore
  >;
}

interface PreviewOwnedImportsService {
  readonly preview: (
    input: Parameters<PreviewOwnedAccountImports["preview"]>[0],
    options?: { readonly signal?: AbortSignal }
  ) => Promise<
    Result<PreviewOwnedAccountImportsOutput, PreviewOwnedAccountImportsError>
  >;
}

interface EffectPreviewOwnedImportsService {
  readonly preview: (
    input: Parameters<EffectPreviewOwnedAccountImports["preview"]>[0],
    options?: { readonly signal?: AbortSignal }
  ) => Effect<
    PreviewOwnedAccountImportsOutput,
    PreviewOwnedAccountImportsError,
    EffectSquadGroupStore
  >;
}

interface ConfirmOwnedAccountImportService {
  readonly confirm: (
    input: Parameters<ConfirmOwnedAccountImport["confirm"]>[0]
  ) => Promise<
    Result<OwnedMargonemAccountSummary, ConfirmOwnedAccountImportError>
  >;
}

interface EffectConfirmOwnedAccountImportService {
  readonly confirm: (
    input: Parameters<EffectConfirmOwnedAccountImport["confirm"]>[0]
  ) => Effect<
    OwnedMargonemAccountSummary,
    EffectConfirmOwnedAccountImportError,
    EffectSquadGroupStore
  >;
}

interface PreviewAccountRefetchService {
  readonly preview: (
    input: Parameters<PreviewAccountRefetch["preview"]>[0],
    options?: { readonly signal?: AbortSignal }
  ) => Promise<Result<PreviewAccountRefetchOutput, PreviewAccountRefetchError>>;
}

interface EffectPreviewAccountRefetchService {
  readonly preview: (
    input: Parameters<EffectPreviewAccountRefetch["preview"]>[0],
    options?: { readonly signal?: AbortSignal }
  ) => Effect<
    PreviewAccountRefetchOutput,
    PreviewAccountRefetchError,
    EffectSquadGroupStore
  >;
}

interface ApplyAccountRefetchService {
  readonly apply: (
    input: Parameters<ApplyAccountRefetch["apply"]>[0]
  ) => Promise<Result<ApplyAccountRefetchOutput, ApplyAccountRefetchError>>;
}

interface EffectApplyAccountRefetchService {
  readonly apply: (
    input: Parameters<EffectApplyAccountRefetch["apply"]>[0]
  ) => Effect<
    ApplyAccountRefetchOutput,
    ApplyAccountRefetchError,
    EffectSquadGroupStore
  >;
}

interface ListOwnedAccountsService {
  readonly list: (
    input: Parameters<ListOwnedMargonemAccounts["list"]>[0]
  ) => Effect<
    readonly OwnedMargonemAccountSummary[],
    ListOwnedMargonemAccountsError,
    EffectSquadGroupStore
  >;
}

interface SearchAccountInviteTargetsService {
  readonly search: (
    input: Parameters<SearchAccountInviteTargets["search"]>[0]
  ) => Promise<Result<readonly AccountInviteTarget[], AccountSharingError>>;
}

interface EffectSearchAccountInviteTargetsService {
  readonly search: (
    input: Parameters<EffectSearchAccountInviteTargets["search"]>[0]
  ) => Effect<
    readonly AccountInviteTarget[],
    AccountSharingError,
    EffectSquadGroupStore
  >;
}

interface SendAccountAccessInviteService {
  readonly send: (
    input: Parameters<SendAccountAccessInvite["send"]>[0]
  ) => Promise<Result<AccountAccessInviteSummary, AccountSharingError>>;
}

interface EffectSendAccountAccessInviteService {
  readonly send: (
    input: Parameters<EffectSendAccountAccessInvite["send"]>[0]
  ) => Effect<
    AccountAccessInviteSummary,
    AccountSharingError,
    EffectSquadGroupStore
  >;
}

interface RespondToAccountAccessInviteService {
  readonly respond: (
    input: Parameters<RespondToAccountAccessInvite["respond"]>[0]
  ) => Promise<Result<AccountAccessInviteSummary, AccountSharingError>>;
}

interface EffectRespondToAccountAccessInviteService {
  readonly respond: (
    input: Parameters<EffectRespondToAccountAccessInvite["respond"]>[0]
  ) => Effect<
    AccountAccessInviteSummary,
    AccountSharingError,
    EffectSquadGroupStore
  >;
}

interface RevokeAccountAccessService {
  readonly revoke: (
    input: Parameters<RevokeAccountAccess["revoke"]>[0]
  ) => Promise<Result<RevokeAccountAccessResult, AccountSharingError>>;
}

interface EffectRevokeAccountAccessService {
  readonly revoke: (
    input: Parameters<EffectRevokeAccountAccess["revoke"]>[0]
  ) => Effect<
    RevokeAccountAccessResult,
    AccountSharingError,
    EffectSquadGroupStore
  >;
}

interface ListAccountSharingStateService {
  readonly listIncomingInvites: (
    input: Parameters<ListAccountSharingState["listIncomingInvites"]>[0]
  ) => Promise<
    Result<readonly AccountAccessInviteSummary[], AccountSharingError>
  >;
  readonly listSharedAccounts: (
    input: Parameters<ListAccountSharingState["listSharedAccounts"]>[0]
  ) => Promise<
    Result<readonly SharedMargonemAccountSummary[], AccountSharingError>
  >;
  readonly listAccountAccessGrants: (
    input: Parameters<ListAccountSharingState["listAccountAccessGrants"]>[0]
  ) => Promise<
    Result<readonly AccountAccessGrantSummary[], AccountSharingError>
  >;
}

interface CreateSquadGroupService {
  readonly create: (
    input: Parameters<CreateSquadGroup["create"]>[0]
  ) => Effect<SquadGroupSummary, CreateSquadGroupError, never>;
}

interface ListGlobalSquadGroupsService {
  readonly list: (
    input: Parameters<ListGlobalSquadGroups["list"]>[0]
  ) => Effect<
    readonly GlobalSquadGroupSummary[],
    SquadBuilderPersistenceUnavailable,
    never
  >;
}

interface ListMySquadGroupsService {
  readonly listMine: (
    input: Parameters<ListSquadGroups["listMine"]>[0]
  ) => Effect<readonly SquadGroupSummary[], ListMySquadGroupsError, never>;
}

interface GetSquadGroupDetailService {
  readonly getMine: (
    input: Parameters<ListSquadGroups["getMine"]>[0]
  ) => Effect<SquadGroupDetail, GetSquadGroupDetailError, never>;
}

interface ListAvailableSquadCharactersService {
  readonly list: (
    input: Parameters<ListAvailableSquadCharacters["list"]>[0]
  ) => Effect<
    readonly AvailableSquadCharacter[],
    ListAvailableSquadCharactersError,
    never
  >;
}

interface SaveSquadGroupService {
  readonly save: (
    input: Parameters<SaveSquadGroup["save"]>[0]
  ) => Promise<Result<SquadGroupDetail, SaveSquadGroupError>>;
}

interface SearchSquadEditorInviteTargetsService {
  readonly search: (
    input: Parameters<SearchSquadEditorInviteTargets["search"]>[0]
  ) => Promise<
    Result<readonly SquadEditorInviteTarget[], SquadGroupSharingError>
  >;
}

interface SendSquadGroupEditorInviteService {
  readonly send: (
    input: Parameters<SendSquadGroupEditorInvite["send"]>[0]
  ) => Promise<Result<SquadGroupInvitationSummary, SquadGroupSharingError>>;
}

interface RespondToSquadGroupInviteService {
  readonly respond: (
    input: Parameters<RespondToSquadGroupInvite["respond"]>[0]
  ) => Promise<Result<SquadGroupInvitationSummary, SquadGroupSharingError>>;
}

interface RevokeSquadGroupEditorService {
  readonly revoke: (
    input: Parameters<RevokeSquadGroupEditor["revoke"]>[0]
  ) => Promise<Result<SquadGroupInvitationSummary, SquadGroupSharingError>>;
}

interface ListSquadGroupSharingStateService {
  readonly listIncomingInvites: (
    input: Parameters<ListSquadGroupSharingState["listIncomingInvites"]>[0]
  ) => Promise<
    Result<readonly SquadGroupInvitationSummary[], SquadGroupSharingError>
  >;
  readonly listSharedGroups: (
    input: Parameters<ListSquadGroupSharingState["listSharedGroups"]>[0]
  ) => Promise<
    Result<readonly SharedSquadGroupSummary[], SquadGroupSharingError>
  >;
  readonly listEditorGrants: (
    input: Parameters<ListSquadGroupSharingState["listEditorGrants"]>[0]
  ) => Promise<
    Result<readonly SquadGroupEditorGrantSummary[], SquadGroupSharingError>
  >;
  readonly countPendingInvites: (
    input: Parameters<ListSquadGroupSharingState["countPendingInvites"]>[0]
  ) => Promise<Result<number, SquadGroupSharingError>>;
}

interface SetSquadGroupVisibilityService {
  readonly set: (
    input: Parameters<SetSquadGroupVisibility["set"]>[0]
  ) => Effect<SquadGroupVisibilityChange, GlobalSquadVisibilityError, never>;
}

interface SaveSharedSquadGroupCharactersService {
  readonly save: (
    input: Parameters<SaveSharedSquadGroupCharacters["save"]>[0]
  ) => Promise<Result<SquadGroupDetail, SharedSquadGroupSaveError>>;
}

interface CreateSquadBuilderRouterOptions {
  readonly previewService?: PreviewProfileImportService;
  readonly effectPreviewService?: EffectPreviewProfileImportService;
  readonly previewOwnedImportsService?: PreviewOwnedImportsService;
  readonly effectPreviewOwnedImportsService?: EffectPreviewOwnedImportsService;
  readonly confirmOwnedAccountImportService?: ConfirmOwnedAccountImportService;
  readonly effectConfirmOwnedAccountImportService?: EffectConfirmOwnedAccountImportService;
  readonly previewAccountRefetchService?: PreviewAccountRefetchService;
  readonly effectPreviewAccountRefetchService?: EffectPreviewAccountRefetchService;
  readonly applyAccountRefetchService?: ApplyAccountRefetchService;
  readonly effectApplyAccountRefetchService?: EffectApplyAccountRefetchService;
  readonly listOwnedAccountsService?: ListOwnedAccountsService;
  readonly searchAccountInviteTargetsService?: SearchAccountInviteTargetsService;
  readonly effectSearchAccountInviteTargetsService?: EffectSearchAccountInviteTargetsService;
  readonly sendAccountAccessInviteService?: SendAccountAccessInviteService;
  readonly effectSendAccountAccessInviteService?: EffectSendAccountAccessInviteService;
  readonly respondToAccountAccessInviteService?: RespondToAccountAccessInviteService;
  readonly effectRespondToAccountAccessInviteService?: EffectRespondToAccountAccessInviteService;
  readonly revokeAccountAccessService?: RevokeAccountAccessService;
  readonly effectRevokeAccountAccessService?: EffectRevokeAccountAccessService;
  readonly listAccountSharingStateService?: ListAccountSharingStateService;
  readonly createSquadGroupService?: CreateSquadGroupService;
  readonly effectRuntime?: ManagedRuntime<EffectSquadGroupStore, unknown>;
  readonly listMySquadGroupsService?: ListMySquadGroupsService;
  readonly getSquadGroupDetailService?: GetSquadGroupDetailService;
  readonly listGlobalSquadGroupsService?: ListGlobalSquadGroupsService;
  readonly listAvailableSquadCharactersService?: ListAvailableSquadCharactersService;
  readonly saveSquadGroupService?: SaveSquadGroupService;
  readonly searchSquadEditorInviteTargetsService?: SearchSquadEditorInviteTargetsService;
  readonly sendSquadGroupEditorInviteService?: SendSquadGroupEditorInviteService;
  readonly respondToSquadGroupInviteService?: RespondToSquadGroupInviteService;
  readonly revokeSquadGroupEditorService?: RevokeSquadGroupEditorService;
  readonly listSquadGroupSharingStateService?: ListSquadGroupSharingStateService;
  readonly saveSharedSquadGroupCharactersService?: SaveSharedSquadGroupCharactersService;
  readonly setSquadGroupVisibilityService?: SetSquadGroupVisibilityService;
}

const previewProfileImportInputSchema = z.object({
  profileUrl: z.string().min(1),
});

const previewOwnedAccountImportsInputSchema = z.object({
  profileUrls: z.array(z.string()).max(20),
});

const confirmOwnedAccountImportInputSchema = z.object({
  displayName: z.string(),
  pendingImportId: z.number().int().positive(),
});

const searchAccountInviteTargetsInputSchema = z.object({
  accountId: z.number().int().positive(),
  query: z.string(),
});

const sendAccountAccessInviteInputSchema = z.object({
  accountId: z.number().int().positive(),
  invitedUserId: z.string().min(1),
});

const respondToAccountAccessInviteInputSchema = z.object({
  accessId: z.number().int().positive(),
  response: z.enum(["accept", "decline"]),
});

const revokeAccountAccessInputSchema = z.object({
  accessId: z.number().int().positive(),
});

const previewAccountRefetchInputSchema = z.object({
  accountId: z.number().int().positive(),
});

const applyAccountRefetchInputSchema = z.object({
  refetchPreviewId: z.number().int().positive(),
});

const listAccountAccessGrantsInputSchema = z.object({
  accountId: z.number().int().positive(),
});

const createSquadGroupInputSchema = Schema.toStandardSchemaV1(
  Schema.Struct({
    name: Schema.String,
  }),
  { parseOptions: strictEffectBoundaryParseOptions }
);

const createSquadGroupOutputSchema = Schema.toStandardSchemaV1(
  Schema.Struct({
    characterCount: Schema.Number,
    groupId: Schema.Number,
    name: Schema.String,
    squadCount: Schema.Number,
    updatedAt: Schema.String,
  }),
  { parseOptions: strictEffectBoundaryParseOptions }
);

const squadGroupListFiltersInputSchema = z
  .object({
    filters: z
      .object({
        maxLevel: z.number().optional(),
        minLevel: z.number().optional(),
        nameQuery: z.string().optional(),
      })
      .optional(),
  })
  .optional();

const squadGroupIdInputSchema = z.object({
  groupId: z.number().int().positive(),
});

const listMySquadGroupsOutputSchema = Schema.toStandardSchemaV1(
  Schema.Struct({
    groups: Schema.Array(createSquadGroupOutputSchema),
  }),
  { parseOptions: strictEffectBoundaryParseOptions }
);

const setSquadGroupVisibilityInputSchema = z.object({
  groupId: z.number().int().positive(),
  visibility: z.enum(["private", "global"]),
});

const saveSquadGroupInputSchema = z.object({
  groupId: z.number().int().positive(),
  name: z.string(),
  squads: z.array(
    z.object({
      characters: z.array(
        z.object({
          characterId: z.number().int().positive(),
          position: z.number().int().nonnegative(),
        })
      ),
      clientKey: z.string().min(1),
      name: z.string(),
      position: z.number().int().nonnegative(),
      squadId: z.number().int().positive().optional(),
    })
  ),
});

const searchSquadEditorInviteTargetsInputSchema = z.object({
  groupId: z.number().int().positive(),
  query: z.string(),
});

const sendSquadGroupEditorInviteInputSchema = z.object({
  groupId: z.number().int().positive(),
  invitedUserId: z.string().min(1),
});

const respondToSquadGroupInviteInputSchema = z.object({
  invitationId: z.number().int().positive(),
  response: z.enum(["accept", "decline"]),
});

const revokeSquadGroupEditorInputSchema = z.object({
  invitationId: z.number().int().positive(),
});

const listSquadGroupEditorGrantsInputSchema = z.object({
  groupId: z.number().int().positive(),
});

const saveSharedSquadGroupCharactersInputSchema = z.object({
  groupId: z.number().int().positive(),
  squads: z.array(
    z.object({
      characters: z.array(
        z.object({
          characterId: z.number().int().positive(),
          position: z.number().int().nonnegative(),
        })
      ),
      squadId: z.number().int().positive(),
    })
  ),
});

type SquadBuilderRouterError =
  | PreviewMargonemProfileImportError
  | InvalidAppUserId
  | ParseFirecrawlConfigError;

const failSquadBuilderServices = (
  error: SquadBuilderRouterError
): Result<SquadBuilderServices, SquadBuilderRouterError> => err(error);

interface SquadBuilderServices {
  readonly preview: PreviewProfileImportService;
  readonly previewOwnedImports: PreviewOwnedImportsService;
  readonly confirm: ConfirmOwnedAccountImportService;
  readonly previewRefetch: PreviewAccountRefetchService;
  readonly applyRefetch: ApplyAccountRefetchService;
  readonly list: ListOwnedAccountsService;
  readonly searchInviteTargets: SearchAccountInviteTargetsService;
  readonly sendInvite: SendAccountAccessInviteService;
  readonly respondInvite: RespondToAccountAccessInviteService;
  readonly revokeAccess: RevokeAccountAccessService;
  readonly sharingState: ListAccountSharingStateService;
  readonly saveSquadGroup: SaveSquadGroupService;
  readonly searchSquadEditorInviteTargets: SearchSquadEditorInviteTargetsService;
  readonly sendSquadGroupEditorInvite: SendSquadGroupEditorInviteService;
  readonly respondToSquadGroupInvite: RespondToSquadGroupInviteService;
  readonly revokeSquadGroupEditor: RevokeSquadGroupEditorService;
  readonly squadGroupSharingState: ListSquadGroupSharingStateService;
  readonly saveSharedSquadGroupCharacters: SaveSharedSquadGroupCharactersService;
}

const createDefaultSquadBuilderServices = (): Result<
  SquadBuilderServices,
  SquadBuilderRouterError
> => {
  const config = parseFirecrawlConfig(process.env);

  if (isError(config)) {
    return failSquadBuilderServices(config.error);
  }

  const store = new DrizzleSquadBuilderStore();
  const singlePreview = new PreviewMargonemProfileImport(
    store,
    store,
    new FirecrawlSdkClient(config.value.apiKey),
    systemClock,
    config.value
  );

  return ok({
    applyRefetch: new ApplyAccountRefetch(store, store, store, systemClock),
    confirm: new ConfirmOwnedAccountImport(store, store, systemClock),
    list: new ListOwnedMargonemAccounts(),
    preview: singlePreview,
    previewOwnedImports: new PreviewOwnedAccountImports(
      singlePreview,
      store,
      store,
      systemClock
    ),
    previewRefetch: new PreviewAccountRefetch(
      store,
      store,
      store,
      store,
      new FirecrawlSdkClient(config.value.apiKey),
      systemClock,
      config.value
    ),
    respondInvite: new RespondToAccountAccessInvite(store, systemClock),
    respondToSquadGroupInvite: new RespondToSquadGroupInvite(
      store,
      systemClock
    ),
    revokeAccess: new RevokeAccountAccess(store, systemClock),
    revokeSquadGroupEditor: new RevokeSquadGroupEditor(store, systemClock),
    saveSharedSquadGroupCharacters: new SaveSharedSquadGroupCharacters(
      store,
      store,
      systemClock
    ),
    saveSquadGroup: new SaveSquadGroup(store, systemClock),
    searchInviteTargets: new SearchAccountInviteTargets(store),
    searchSquadEditorInviteTargets: new SearchSquadEditorInviteTargets(store),
    sendInvite: new SendAccountAccessInvite(store, systemClock),
    sendSquadGroupEditorInvite: new SendSquadGroupEditorInvite(
      store,
      systemClock
    ),
    sharingState: new ListAccountSharingState(store),
    squadGroupSharingState: new ListSquadGroupSharingState(store),
  });
};

const toPreviewProfileImportResponse = (
  output: PreviewMargonemProfileImportOutput
) => ({
  firecrawlCreditsUsed: output.firecrawlCreditsUsed,
  generatedProfileUrl: output.generatedProfileUrl,
  jarunaCharacters: output.jarunaCharacters.map((character) => ({
    avatarUrl: character.avatarUrl,
    characterId: character.characterId,
    level: character.level,
    name: character.name,
    profession: character.profession,
  })),
  lastFetchedAt: output.lastFetchedAt.toISOString(),
  profileId: output.profileId,
  suggestedAccountName: output.suggestedAccountName,
});

const lineErrorToTag = (error: PreviewOwnedAccountImportLineError): string => {
  switch (error._tag) {
    case "InvalidMargonemProfileUrl":
    case "MissingMargonemProfileId": {
      return "InvalidProfileUrl";
    }
    case "DuplicateProfileInBatch": {
      return "DuplicateProfileInBatch";
    }
    case "MargonemAccountAlreadyOwnedByActor": {
      return "AlreadyOwnedByActor";
    }
    case "MargonemAccountOwnedByAnotherUser": {
      return "OwnedByAnotherUser";
    }
    case "MargonemAccountAlreadySharedWithActor": {
      return "AlreadySharedWithActor";
    }
    case "FirecrawlMonthlyBudgetExhausted": {
      return "BudgetExhausted";
    }
    case "FirecrawlRequestFailed":
    case "FirecrawlResponseNotParseable":
    case "RequestCancelled": {
      return "FirecrawlFailed";
    }
    case "MargonemProfileNameNotFound":
    case "MargonemCharacterRowsNotFound":
    case "MargonemCharacterRowInvalid": {
      return "ProfileParseFailed";
    }
    case "SquadBuilderPersistenceUnavailable": {
      return "PersistenceUnavailable";
    }
    default: {
      return casesHandled(error);
    }
  }
};

const lineErrorToMessage = (
  error: PreviewOwnedAccountImportLineError
): string => {
  switch (error._tag) {
    case "InvalidMargonemProfileUrl":
    case "MissingMargonemProfileId": {
      return "To nie jest poprawny link do profilu Margonem.";
    }
    case "DuplicateProfileInBatch": {
      return "Ten profil już występuje wyżej w liście.";
    }
    case "MargonemAccountAlreadyOwnedByActor": {
      return "Ten profil jest już dodany do Twoich kont.";
    }
    case "MargonemAccountOwnedByAnotherUser": {
      return "Ten profil został już dodany przez innego użytkownika.";
    }
    case "MargonemAccountAlreadySharedWithActor": {
      return "Ten profil jest już Ci udostępniony.";
    }
    case "FirecrawlMonthlyBudgetExhausted": {
      return "Limit pobierania profili na ten miesiąc został wyczerpany.";
    }
    case "FirecrawlRequestFailed":
    case "FirecrawlResponseNotParseable":
    case "RequestCancelled": {
      return "Nie udało się pobrać profilu Margonem.";
    }
    case "MargonemProfileNameNotFound":
    case "MargonemCharacterRowsNotFound":
    case "MargonemCharacterRowInvalid": {
      return "Nie udało się odczytać danych profilu Margonem.";
    }
    case "SquadBuilderPersistenceUnavailable": {
      return "Nie udało się zapisać podglądu. Spróbuj ponownie.";
    }
    default: {
      return casesHandled(error);
    }
  }
};

const toPreviewOwnedAccountImportItemDto = (
  item: PreviewOwnedAccountImportItem
) => {
  if (item._tag === "PreviewSucceeded") {
    return {
      avatarUrl: null,
      characterCount: item.jarunaCharacters.length,
      defaultDisplayName: item.defaultDisplayName,
      errorTag: null,
      firecrawlCreditsUsed: item.firecrawlCreditsUsed,
      generatedProfileUrl: item.generatedProfileUrl,
      inputUrl: item.inputUrl,
      jarunaCharacters: item.jarunaCharacters.map((character) => ({
        avatarUrl: character.avatarUrl,
        characterId: character.characterId,
        level: character.level,
        name: character.name,
        profession: character.profession,
      })),
      lastFetchedAt: item.lastFetchedAt.toISOString(),
      lineNumber: item.lineNumber,
      message: null,
      pendingImportId: item.pendingImportId,
      profileId: item.profileId,
      status: "success" as const,
      suggestedAccountName: item.suggestedAccountName,
    };
  }

  return {
    avatarUrl: null,
    characterCount: 0,
    defaultDisplayName: null,
    errorTag: lineErrorToTag(item.error),
    firecrawlCreditsUsed: 0,
    generatedProfileUrl: null,
    inputUrl: item.inputUrl,
    jarunaCharacters: [],
    lastFetchedAt: null,
    lineNumber: item.lineNumber,
    message: lineErrorToMessage(item.error),
    pendingImportId: null,
    profileId: null,
    status: "error" as const,
    suggestedAccountName: null,
  };
};

const toConfirmOwnedAccountImportResponse = (
  output: OwnedMargonemAccountSummary
) => ({
  accountId: output.accountId,
  characterCount: output.characterCount,
  displayName: output.displayName,
  generatedProfileUrl: output.generatedProfileUrl,
  lastFetchedAt: output.lastFetchedAt.toISOString(),
  profileId: output.profileId,
});

const toListOwnedAccountsResponse = (
  accounts: readonly OwnedMargonemAccountSummary[]
) => ({
  accounts: accounts.map((account) => ({
    accountId: account.accountId,
    characterCount: account.characterCount,
    displayName: account.displayName,
    generatedProfileUrl: account.generatedProfileUrl,
    lastFetchedAt: account.lastFetchedAt.toISOString(),
    profileId: account.profileId,
  })),
});

const toPreviewAccountRefetchResponse = (
  output: PreviewAccountRefetchOutput
) => ({
  accountId: margonemAccountIdToNumber(output.accountId),
  diff: {
    added: output.diff.added.map((item) => ({
      avatarUrl: item.latest.avatarUrl,
      characterId: item.latest.characterId,
      level: item.latest.level,
      name: item.latest.name,
      profession: item.latest.profession,
    })),
    changed: output.diff.changed.map((item) => ({
      changes: item.changes.map((change) => ({
        after: change.after,
        before: change.before,
        field: change.field,
      })),
      characterId: item.margonemCharacterId,
      databaseCharacterId: item.databaseCharacterId,
      name: item.latest.name,
    })),
    removed: output.diff.removed.map((item) => ({
      affectedSquadCount: item.current.affectedSquadCount,
      avatarUrl: item.current.avatarUrl,
      characterId: item.current.margonemCharacterId,
      databaseCharacterId: item.current.databaseCharacterId,
      level: item.current.level,
      name: item.current.name,
      profession: item.current.profession,
    })),
    unchangedCount: output.diff.unchangedCount,
  },
  fetchedAt: output.fetchedAt.toISOString(),
  firecrawlCreditsUsed: output.firecrawlCreditsUsed,
  generatedProfileUrl: output.generatedProfileUrl,
  profileId: profileIdToNumber(output.profileId),
  refetchPreviewId: output.refetchPreviewId,
});

const toApplyAccountRefetchResponse = (output: ApplyAccountRefetchOutput) => ({
  accountId: margonemAccountIdToNumber(output.accountId),
  addedCharacterCount: output.addedCharacterCount,
  lastFetchedAt: output.lastFetchedAt.toISOString(),
  profileId: profileIdToNumber(output.profileId),
  removedCharacterCount: output.removedCharacterCount,
  removedSquadCharacterCount: output.removedSquadCharacterCount,
  updatedCharacterCount: output.updatedCharacterCount,
});

const toAccountInviteTargetDto = (target: AccountInviteTarget) => ({
  image: target.image,
  name: target.name,
  userId: appUserIdToString(target.userId),
});

const toAccountAccessInviteDto = (invite: AccountAccessInviteSummary) => ({
  accessId: margonemAccountAccessIdToNumber(invite.accessId),
  accountDisplayName: accountDisplayNameToString(invite.accountDisplayName),
  accountId: margonemAccountIdToNumber(invite.accountId),
  createdAt: invite.createdAt.toISOString(),
  generatedProfileUrl: invite.generatedProfileUrl,
  ownerUserImage: invite.ownerUserImage,
  ownerUserName: invite.ownerUserName,
  status: invite.status,
  updatedAt: invite.updatedAt.toISOString(),
});

const toSharedMargonemAccountDto = (account: SharedMargonemAccountSummary) => ({
  accountId: margonemAccountIdToNumber(account.accountId),
  characterCount: account.characterCount,
  displayName: accountDisplayNameToString(account.displayName),
  generatedProfileUrl: account.generatedProfileUrl,
  lastFetchedAt: account.lastFetchedAt.toISOString(),
  ownerUserImage: account.ownerUserImage,
  ownerUserName: account.ownerUserName,
  profileId: profileIdToNumber(account.profileId),
});

const toAccountAccessGrantDto = (grant: AccountAccessGrantSummary) => ({
  accessId: margonemAccountAccessIdToNumber(grant.accessId),
  createdAt: grant.createdAt.toISOString(),
  status: grant.status,
  updatedAt: grant.updatedAt.toISOString(),
  userId: appUserIdToString(grant.invitedUserId),
  userImage: grant.invitedUserImage,
  userName: grant.invitedUserName,
});

const toSquadGroupSummaryDto = (group: SquadGroupSummary) => ({
  characterCount: group.characterCount,
  groupId: group.groupId,
  name: group.name,
  squadCount: group.squadCount,
  updatedAt: group.updatedAt.toISOString(),
});

const toSquadGroupDetailDto = (detail: SquadGroupDetail) => ({
  accessRole: detail.accessRole,
  groupId: detail.groupId,
  name: detail.name,
  squads: detail.squads.map((squadDetail) => ({
    characters: squadDetail.characters.map((character) => ({
      accountDisplayName: accountDisplayNameToString(
        character.accountDisplayName
      ),
      accountId: margonemAccountIdToNumber(character.accountId),
      accountOwnerUserImage: character.accountOwnerUserImage,
      accountOwnerUserName: character.accountOwnerUserName,
      avatarUrl: character.avatarUrl,
      characterId: character.characterId,
      level: character.level,
      margonemCharacterId: character.margonemCharacterId,
      name: character.name,
      placementId: character.placementId,
      position: character.position,
      profession: character.profession,
    })),
    name: squadDetail.name,
    position: squadDetail.position,
    squadId: squadDetail.squadId,
  })),
  updatedAt: detail.updatedAt.toISOString(),
  visibility: detail.visibility,
});

const toSquadEditorInviteTargetDto = (target: SquadEditorInviteTarget) => ({
  image: target.image,
  name: target.name,
  userId: appUserIdToString(target.userId),
});

const toSquadGroupInvitationDto = (invite: SquadGroupInvitationSummary) => ({
  createdAt: invite.createdAt.toISOString(),
  invitationId: squadGroupInvitationIdToNumber(invite.invitationId),
  ownerUserImage: invite.ownerUserImage,
  ownerUserName: invite.ownerUserName,
  squadGroupId: invite.squadGroupId,
  squadGroupName: invite.squadGroupName,
  status: invite.status,
  updatedAt: invite.updatedAt.toISOString(),
});

const toSharedSquadGroupDto = (group: SharedSquadGroupSummary) => ({
  characterCount: group.characterCount,
  groupId: group.groupId,
  name: group.name,
  ownerUserImage: group.ownerUserImage,
  ownerUserName: group.ownerUserName,
  squadCount: group.squadCount,
  updatedAt: group.updatedAt.toISOString(),
});

const toGlobalSquadGroupDto = (group: GlobalSquadGroupSummary) => ({
  characterCount: group.characterCount,
  groupId: group.groupId,
  name: group.name,
  ownerUserImage: group.ownerUserImage,
  ownerUserName: group.ownerUserName,
  squadCount: group.squadCount,
  updatedAt: group.updatedAt.toISOString(),
});

const toSquadGroupEditorGrantDto = (grant: SquadGroupEditorGrantSummary) => ({
  createdAt: grant.createdAt.toISOString(),
  invitationId: squadGroupInvitationIdToNumber(grant.invitationId),
  status: grant.status,
  updatedAt: grant.updatedAt.toISOString(),
  userId: appUserIdToString(grant.userId),
  userImage: grant.userImage,
  userName: grant.userName,
});

const toAvailableSquadCharacterDto = (character: AvailableSquadCharacter) => ({
  accountDisplayName: accountDisplayNameToString(character.accountDisplayName),
  accountId: margonemAccountIdToNumber(character.accountId),
  accountOwnerUserImage: character.accountOwnerUserImage,
  accountOwnerUserName: character.accountOwnerUserName,
  avatarUrl: character.avatarUrl,
  characterId: character.characterId,
  level: character.level,
  margonemCharacterId: character.margonemCharacterId,
  name: character.name,
  profession: character.profession,
});

const logSquadBuilderError = (
  context: RouterContext,
  operation: SquadBuilderLogOperation,
  error: { readonly _tag: string }
) => {
  context.logger.error("Squad builder operation failed", {
    squadBuilder: {
      errorTag: error._tag,
      operation,
    },
  });
};

type SquadBuilderLogOperation =
  | "previewOwnedAccountImports"
  | "confirmOwnedAccountImport"
  | "listOwnedAccounts"
  | "previewMargonemProfileImport"
  | "previewAccountRefetch"
  | "applyAccountRefetch"
  | "searchAccountInviteTargets"
  | "sendAccountAccessInvite"
  | "respondToAccountAccessInvite"
  | "revokeAccountAccess"
  | "listIncomingAccountInvites"
  | "listSharedAccounts"
  | "listAccountAccessGrants"
  | "createSquadGroup"
  | "listMySquadGroups"
  | "listGlobalSquadGroups"
  | "setSquadGroupVisibility"
  | "getSquadGroupDetail"
  | "listAvailableSquadCharacters"
  | "saveSquadGroup"
  | "searchSquadEditorInviteTargets"
  | "sendSquadGroupEditorInvite"
  | "listIncomingSquadGroupInvites"
  | "respondToSquadGroupInvite"
  | "revokeSquadGroupEditor"
  | "listSharedSquadGroups"
  | "listSquadGroupEditorGrants"
  | "getPendingSquadGroupInviteCount"
  | "saveSharedSquadGroupCharacters";

const toOrpcError = (error: SquadBuilderRouterError) => {
  switch (error._tag) {
    case "InvalidMargonemProfileUrl":
    case "MissingMargonemProfileId": {
      return new ORPCError("BAD_REQUEST", { message: error.message });
    }
    case "InvalidAppUserId": {
      return new ORPCError("BAD_REQUEST");
    }
    case "MargonemAccountAlreadyOwnedByActor": {
      return new ORPCError("CONFLICT", {
        message: "Ten profil jest już dodany do Twoich kont",
      });
    }
    case "MargonemAccountAlreadySharedWithActor": {
      return new ORPCError("CONFLICT", {
        message: "Ten profil jest już Ci udostępniony",
      });
    }
    case "MargonemAccountOwnedByAnotherUser": {
      return new ORPCError("CONFLICT", {
        message: "Ten profil został już dodany przez innego użytkownika",
      });
    }
    case "FirecrawlMonthlyBudgetExhausted": {
      return new ORPCError("TOO_MANY_REQUESTS", {
        message: "Miesięczny limit pobierania profili został wyczerpany",
      });
    }
    case "FirecrawlRequestFailed":
    case "FirecrawlResponseNotParseable":
    case "MargonemProfileNameNotFound":
    case "MargonemCharacterRowsNotFound":
    case "MargonemCharacterRowInvalid":
    case "RequestCancelled": {
      return new ORPCError("BAD_GATEWAY", {
        message: "Nie udało się pobrać profilu Margonem",
      });
    }
    case "SquadBuilderPersistenceUnavailable":
    case "InvalidFirecrawlConfig": {
      return new ORPCError("INTERNAL_SERVER_ERROR");
    }
    default: {
      return casesHandled(error);
    }
  }
};

const toPreviewOwnedImportsOrpcError = (
  error: PreviewOwnedAccountImportsError
) => {
  switch (error._tag) {
    case "EmptyProfileUrlBatch": {
      return new ORPCError("BAD_REQUEST", {
        message: "Wklej co najmniej jeden link do profilu.",
      });
    }
    case "TooManyProfileUrlsInBatch": {
      return new ORPCError("BAD_REQUEST", {
        message: `Możesz sprawdzić maksymalnie ${error.maxUrls} linków naraz.`,
      });
    }
    case "SquadBuilderPersistenceUnavailable": {
      return new ORPCError("INTERNAL_SERVER_ERROR");
    }
    default: {
      return casesHandled(error);
    }
  }
};

const toConfirmOrpcError = (error: ConfirmOwnedAccountImportError) => {
  switch (error._tag) {
    case "InvalidAccountDisplayName": {
      return new ORPCError("BAD_REQUEST", { message: error.message });
    }
    case "PendingMargonemAccountImportNotFound": {
      return new ORPCError("NOT_FOUND", {
        message: "Podgląd wygasł. Sprawdź konto ponownie.",
      });
    }
    case "MargonemAccountAlreadyOwnedByActor": {
      return new ORPCError("CONFLICT", {
        message: "Ten profil jest już dodany do Twoich kont",
      });
    }
    case "MargonemAccountAlreadySharedWithActor": {
      return new ORPCError("CONFLICT", {
        message: "Ten profil jest już Ci udostępniony",
      });
    }
    case "MargonemAccountOwnedByAnotherUser": {
      return new ORPCError("CONFLICT", {
        message: "Ten profil został już dodany przez innego użytkownika",
      });
    }
    case "SquadBuilderPersistenceUnavailable": {
      return new ORPCError("INTERNAL_SERVER_ERROR");
    }
    default: {
      return casesHandled(error);
    }
  }
};

const toListOrpcError = (error: ListOwnedMargonemAccountsError) => {
  void error;
  return new ORPCError("INTERNAL_SERVER_ERROR");
};

const toAccountRefetchOrpcError = (
  error: PreviewAccountRefetchError | ApplyAccountRefetchError
) => {
  switch (error._tag) {
    case "MargonemAccountNotFound":
    case "PendingMargonemAccountRefetchNotFound": {
      return new ORPCError("NOT_FOUND", {
        message: "Podgląd odświeżenia wygasł. Pobierz profil ponownie.",
      });
    }
    case "ActorDoesNotOwnMargonemAccount": {
      return new ORPCError("FORBIDDEN", {
        message: "Tylko właściciel konta może odświeżać postacie",
      });
    }
    case "FirecrawlMonthlyBudgetExhausted": {
      return new ORPCError("TOO_MANY_REQUESTS", {
        message: "Miesięczny limit pobierania profili został wyczerpany",
      });
    }
    case "FirecrawlRequestFailed":
    case "FirecrawlResponseNotParseable":
    case "RequestCancelled":
    case "MargonemProfileNameNotFound":
    case "MargonemCharacterRowsNotFound":
    case "MargonemCharacterRowInvalid": {
      return new ORPCError("BAD_GATEWAY", {
        message: "Nie udało się pobrać profilu Margonem",
      });
    }
    case "SquadBuilderPersistenceUnavailable": {
      return new ORPCError("INTERNAL_SERVER_ERROR");
    }
    default: {
      return casesHandled(error);
    }
  }
};

const errorMessageOr = (error: object, fallback: string): string =>
  "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;

// oxlint-disable-next-line complexity
const toSquadGroupOrpcError = (
  error:
    | CreateSquadGroupError
    | SquadGroupSharingError
    | SaveSquadGroupError
    | SharedSquadGroupSaveError
    | GlobalSquadVisibilityError
    | SquadGroupListFilterError
) => {
  switch (error._tag) {
    case "InvalidSquadGroupId":
    case "InvalidSquadGroupVisibility":
    case "InvalidSquadId":
    case "InvalidSquadSnapshot":
    case "InvalidSquadGroupNameQuery":
    case "InvalidSquadGroupLevelRange": {
      return new ORPCError("BAD_REQUEST", {
        message: errorMessageOr(error, "Nieprawidłowe dane składu"),
      });
    }
    case "InvalidSquadGroupName":
    case "InvalidSquadName":
    case "TooManyCharactersInSquad":
    case "DuplicateCharacterInSquad":
    case "DuplicateAccountInSquad":
    case "DuplicateCharacterInSquadGroup":
    case "SquadCharacterNotJaruna": {
      return new ORPCError("BAD_REQUEST", {
        message: errorMessageOr(
          error,
          "Nie można zapisać składu w tej postaci"
        ),
      });
    }
    case "SquadCharacterNotAccessible":
    case "ActorDoesNotOwnSquadGroup":
    case "ActorCannotViewSquadGroup":
    case "ActorCannotEditSquadGroup": {
      return new ORPCError("FORBIDDEN", {
        message: "Nie masz dostępu do tej grupy składów lub postaci",
      });
    }
    case "SquadGroupNotFound": {
      return new ORPCError("NOT_FOUND", {
        message: "Grupa składów nie została znaleziona",
      });
    }
    case "SquadEditorInviteTargetNotFound":
    case "SquadGroupInvitationNotFound": {
      return new ORPCError("NOT_FOUND", {
        message: "Zaproszenie lub użytkownik nie został znaleziony",
      });
    }
    case "CannotInviteSelf":
    case "SquadEditorInviteTargetNotVerified":
    case "InvalidSquadGroupInvitationId":
    case "InvalidAppUserId":
    case "InvalidAccountInviteTargetQuery":
    case "EditorCannotChangeSquadStructure":
    case "SquadNotInGroup": {
      return new ORPCError("BAD_REQUEST", {
        message: errorMessageOr(error, "Nieprawidłowe zapytanie"),
      });
    }
    case "ActorIsNotSquadGroupInviteRecipient": {
      return new ORPCError("FORBIDDEN", {
        message: "Tylko zaproszony użytkownik może odpowiedzieć na zaproszenie",
      });
    }
    case "SquadGroupInvitationTransitionNotAllowed": {
      return new ORPCError("CONFLICT", {
        message: "Nie można wykonać tej akcji dla tego zaproszenia",
      });
    }
    case "SquadBuilderPersistenceUnavailable": {
      return new ORPCError("INTERNAL_SERVER_ERROR");
    }
    default: {
      return casesHandled(error);
    }
  }
};

const toAccountSharingOrpcError = (error: AccountSharingError) => {
  switch (error._tag) {
    case "MargonemAccountNotFound": {
      return new ORPCError("NOT_FOUND", {
        message: "Konto Margonem nie zostało znalezione",
      });
    }
    case "ActorDoesNotOwnMargonemAccount": {
      return new ORPCError("FORBIDDEN", {
        message: "Tylko właściciel konta może wykonać tę akcję",
      });
    }
    case "CannotInviteSelf": {
      return new ORPCError("BAD_REQUEST", {
        message: "Nie możesz udostępnić konta samemu sobie",
      });
    }
    case "InviteTargetNotFound": {
      return new ORPCError("NOT_FOUND", {
        message: "Wybrany użytkownik nie istnieje",
      });
    }
    case "InviteTargetNotVerified": {
      return new ORPCError("BAD_REQUEST", {
        message: "Możesz zapraszać tylko zweryfikowanych użytkowników",
      });
    }
    case "AccountAccessInviteNotFound": {
      return new ORPCError("NOT_FOUND", {
        message: "Zaproszenie nie zostało znalezione",
      });
    }
    case "ActorIsNotInviteRecipient": {
      return new ORPCError("FORBIDDEN", {
        message: "Tylko zaproszony użytkownik może odpowiedzieć na zaproszenie",
      });
    }
    case "AccountAccessTransitionNotAllowed": {
      const pending =
        error.currentStatus === "pending" || error.currentStatus === "accepted";

      return new ORPCError("CONFLICT", {
        message: pending
          ? "To konto jest już udostępnione lub zaproszenie czeka na odpowiedź"
          : "Nie można wykonać tej akcji dla tego zaproszenia",
      });
    }
    case "InvalidMargonemAccountId":
    case "InvalidMargonemAccountAccessId":
    case "InvalidAppUserId": {
      return new ORPCError("BAD_REQUEST", {
        message: "Nieprawidłowe zapytanie",
      });
    }
    case "InvalidAccountInviteTargetQuery": {
      return new ORPCError("BAD_REQUEST", { message: error.message });
    }
    case "SquadBuilderPersistenceUnavailable": {
      return new ORPCError("INTERNAL_SERVER_ERROR");
    }
    default: {
      return casesHandled(error);
    }
  }
};

const defaultServices = createDefaultSquadBuilderServices();

const defaultEffectRuntime =
  process.env.DATABASE_URL === undefined
    ? undefined
    : makeApiManagedRuntime(process.env.DATABASE_URL);

const createSquadGroupEffect = new CreateSquadGroup();
const listGlobalSquadGroupsEffect = new ListGlobalSquadGroups();
const listSquadGroupsEffect = new ListSquadGroups();
const listAvailableSquadCharactersEffect = new ListAvailableSquadCharacters();
const setSquadGroupVisibilityEffect = new SetSquadGroupVisibility(systemClock);
const listOwnedAccountsEffect = new ListOwnedMargonemAccounts();
const applyAccountRefetchEffect = new EffectApplyAccountRefetch(systemClock);
const searchAccountInviteTargetsEffect = new EffectSearchAccountInviteTargets();
const sendAccountAccessInviteEffect = new EffectSendAccountAccessInvite(
  systemClock
);
const respondToAccountAccessInviteEffect =
  new EffectRespondToAccountAccessInvite(systemClock);
const revokeAccountAccessEffect = new EffectRevokeAccountAccess(systemClock);
const confirmOwnedAccountImportEffect = new EffectConfirmOwnedAccountImport(
  systemClock
);
const createDefaultPreviewProfileImportEffect = (): Result<
  EffectPreviewMargonemProfileImport,
  SquadBuilderRouterError
> => {
  const config = parseFirecrawlConfig(process.env);

  if (isError(config)) {
    return err(config.error);
  }

  return ok(
    new EffectPreviewMargonemProfileImport(
      new FirecrawlSdkClient(config.value.apiKey),
      systemClock,
      config.value
    )
  );
};

const createDefaultPreviewOwnedAccountImportsEffect = (): Result<
  EffectPreviewOwnedAccountImports,
  SquadBuilderRouterError
> => {
  const singlePreview = createDefaultPreviewProfileImportEffect();

  if (isError(singlePreview)) {
    return err(singlePreview.error);
  }

  return ok(
    new EffectPreviewOwnedAccountImports(singlePreview.value, systemClock)
  );
};

const createDefaultPreviewAccountRefetchEffect = (): Result<
  EffectPreviewAccountRefetch,
  SquadBuilderRouterError
> => {
  const config = parseFirecrawlConfig(process.env);

  if (isError(config)) {
    return err(config.error);
  }

  return ok(
    new EffectPreviewAccountRefetch(
      new FirecrawlSdkClient(config.value.apiKey),
      systemClock,
      config.value
    )
  );
};

/** Create the squad-builder ORPC router. */
export const createSquadBuilderRouter = ({
  previewService,
  effectPreviewService,
  previewOwnedImportsService,
  effectPreviewOwnedImportsService,
  confirmOwnedAccountImportService,
  effectConfirmOwnedAccountImportService,
  previewAccountRefetchService,
  effectPreviewAccountRefetchService,
  applyAccountRefetchService,
  effectApplyAccountRefetchService,
  listOwnedAccountsService,
  searchAccountInviteTargetsService,
  effectSearchAccountInviteTargetsService,
  sendAccountAccessInviteService,
  effectSendAccountAccessInviteService,
  respondToAccountAccessInviteService,
  effectRespondToAccountAccessInviteService,
  revokeAccountAccessService,
  effectRevokeAccountAccessService,
  listAccountSharingStateService,
  createSquadGroupService,
  listMySquadGroupsService,
  getSquadGroupDetailService,
  listGlobalSquadGroupsService,
  listAvailableSquadCharactersService,
  saveSquadGroupService,
  searchSquadEditorInviteTargetsService,
  sendSquadGroupEditorInviteService,
  respondToSquadGroupInviteService,
  revokeSquadGroupEditorService,
  listSquadGroupSharingStateService,
  saveSharedSquadGroupCharactersService,
  effectRuntime = defaultEffectRuntime,
  setSquadGroupVisibilityService,
}: CreateSquadBuilderRouterOptions = {}) => ({
  applyAccountRefetch: verifiedProcedure
    .input(applyAccountRefetchInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const refetchPreviewId = parsePendingMargonemAccountRefetchId(
        input.refetchPreviewId
      );

      if (isError(refetchPreviewId)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Nieprawidłowy identyfikator podglądu odświeżenia.",
        });
      }

      if (applyAccountRefetchService !== undefined) {
        const result = await applyAccountRefetchService.apply({
          actorUserId: actorUserId.value,
          refetchPreviewId: refetchPreviewId.value,
        });

        if (isError(result)) {
          logSquadBuilderError(context, "applyAccountRefetch", result.error);
          throw toAccountRefetchOrpcError(result.error);
        }

        return toApplyAccountRefetchResponse(result.value);
      }

      const effect = (
        effectApplyAccountRefetchService ?? applyAccountRefetchEffect
      ).apply({
        actorUserId: actorUserId.value,
        refetchPreviewId: refetchPreviewId.value,
      });

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error("DATABASE_URL is required for applyAccountRefetch"),
          operation: "applyAccountRefetch",
        };
        logSquadBuilderError(context, "applyAccountRefetch", error);
        throw toAccountRefetchOrpcError(error);
      }

      const applied = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as ApplyAccountRefetchError;
        logSquadBuilderError(context, "applyAccountRefetch", mapped);
        return toAccountRefetchOrpcError(mapped);
      });

      return toApplyAccountRefetchResponse(applied);
    }),
  confirmOwnedAccountImport: verifiedProcedure
    .input(confirmOwnedAccountImportInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const pendingImportId = parsePendingMargonemAccountImportId(
        input.pendingImportId
      );

      if (isError(pendingImportId)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Nieprawidłowy identyfikator podglądu importu.",
        });
      }

      if (confirmOwnedAccountImportService !== undefined) {
        const result = await confirmOwnedAccountImportService.confirm({
          actorUserId: actorUserId.value,
          displayName: input.displayName,
          pendingImportId: pendingImportId.value,
        });

        if (isError(result)) {
          logSquadBuilderError(
            context,
            "confirmOwnedAccountImport",
            result.error
          );
          throw toConfirmOrpcError(result.error);
        }

        return toConfirmOwnedAccountImportResponse(result.value);
      }

      const effect = (
        effectConfirmOwnedAccountImportService ??
        confirmOwnedAccountImportEffect
      ).confirm({
        actorUserId: actorUserId.value,
        displayName: input.displayName,
        pendingImportId: pendingImportId.value,
      });

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error(
            "DATABASE_URL is required for confirmOwnedAccountImport"
          ),
          operation: "confirmOwnedAccountImport",
        };
        logSquadBuilderError(context, "confirmOwnedAccountImport", error);
        throw toConfirmOrpcError(error);
      }

      const result = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as ConfirmOwnedAccountImportError;
        logSquadBuilderError(context, "confirmOwnedAccountImport", mapped);
        return toConfirmOrpcError(mapped);
      });

      return toConfirmOwnedAccountImportResponse(result);
    }),
  createSquadGroup: verifiedProcedure
    .input(createSquadGroupInputSchema)
    .output(createSquadGroupOutputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const effect = (createSquadGroupService ?? createSquadGroupEffect).create(
        {
          actorUserId: actorUserId.value,
          name: input.name,
        }
      );

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error("DATABASE_URL is required for createSquadGroup"),
          operation: "createSquadGroup",
        };
        logSquadBuilderError(context, "createSquadGroup", error);
        throw toSquadGroupOrpcError(error);
      }

      const group = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as CreateSquadGroupError;
        logSquadBuilderError(context, "createSquadGroup", mapped);
        return toSquadGroupOrpcError(mapped);
      });

      return toSquadGroupSummaryDto(group);
    }),
  getPendingSquadGroupInviteCount: verifiedProcedure.handler(
    async ({ context }) => {
      const actorUserId = parseAppUserId(context.session.user.id);
      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }
      const services =
        listSquadGroupSharingStateService === undefined
          ? defaultServices
          : ok({
              squadGroupSharingState: listSquadGroupSharingStateService,
            });
      if (isError(services)) {
        logSquadBuilderError(
          context,
          "getPendingSquadGroupInviteCount",
          services.error
        );
        throw toOrpcError(services.error);
      }
      const result =
        await services.value.squadGroupSharingState.countPendingInvites({
          actorUserId: actorUserId.value,
        });
      if (isError(result)) {
        logSquadBuilderError(
          context,
          "getPendingSquadGroupInviteCount",
          result.error
        );
        throw toSquadGroupOrpcError(result.error);
      }
      return { count: result.value };
    }
  ),
  getSquadGroupDetail: verifiedProcedure
    .input(squadGroupIdInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const groupId = parseSquadGroupId(input.groupId);
      if (isError(groupId)) {
        throw toSquadGroupOrpcError(groupId.error);
      }

      const effect = (
        getSquadGroupDetailService ?? listSquadGroupsEffect
      ).getMine({
        actorUserId: actorUserId.value,
        groupId: groupId.value,
      });

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error("DATABASE_URL is required for getSquadGroupDetail"),
          operation: "getSquadGroupDetail",
        };
        logSquadBuilderError(context, "getSquadGroupDetail", error);
        throw toSquadGroupOrpcError(error);
      }

      const detail = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as GetSquadGroupDetailError;
        logSquadBuilderError(context, "getSquadGroupDetail", mapped);
        return toSquadGroupOrpcError(mapped);
      });

      return toSquadGroupDetailDto(detail);
    }),
  listAccountAccessGrants: verifiedProcedure
    .input(listAccountAccessGrantsInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const accountId = parseMargonemAccountId(input.accountId);

      if (isError(accountId)) {
        throw toAccountSharingOrpcError(accountId.error);
      }

      const services =
        listAccountSharingStateService === undefined
          ? defaultServices
          : ok({
              sharingState: listAccountSharingStateService,
            });

      if (isError(services)) {
        logSquadBuilderError(
          context,
          "listAccountAccessGrants",
          services.error
        );
        throw toOrpcError(services.error);
      }

      const result = await services.value.sharingState.listAccountAccessGrants({
        accountId: accountId.value,
        actorUserId: actorUserId.value,
      });

      if (isError(result)) {
        logSquadBuilderError(context, "listAccountAccessGrants", result.error);
        throw toAccountSharingOrpcError(result.error);
      }

      return {
        grants: result.value.map(toAccountAccessGrantDto),
      };
    }),
  listAvailableSquadCharacters: verifiedProcedure
    .input(squadGroupIdInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const groupId = parseSquadGroupId(input.groupId);
      if (isError(groupId)) {
        throw toSquadGroupOrpcError(groupId.error);
      }

      const effect = (
        listAvailableSquadCharactersService ??
        listAvailableSquadCharactersEffect
      ).list({
        actorUserId: actorUserId.value,
        groupId: groupId.value,
      });

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error(
            "DATABASE_URL is required for listAvailableSquadCharacters"
          ),
          operation: "listAvailableSquadCharacters",
        };
        logSquadBuilderError(context, "listAvailableSquadCharacters", error);
        throw toSquadGroupOrpcError(error);
      }

      const characters = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as ListAvailableSquadCharactersError;
        logSquadBuilderError(context, "listAvailableSquadCharacters", mapped);
        return toSquadGroupOrpcError(mapped);
      });

      return { characters: characters.map(toAvailableSquadCharacterDto) };
    }),
  listGlobalSquadGroups: verifiedProcedure
    .input(squadGroupListFiltersInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const filters = parseSquadGroupListFilters(input?.filters ?? {});
      if (isError(filters)) {
        throw toSquadGroupOrpcError(filters.error);
      }

      const effect = (
        listGlobalSquadGroupsService ?? listGlobalSquadGroupsEffect
      ).list({
        actorUserId: actorUserId.value,
        filters: filters.value,
      });

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error(
            "DATABASE_URL is required for listGlobalSquadGroups"
          ),
          operation: "listGlobalSquadGroups",
        };
        logSquadBuilderError(context, "listGlobalSquadGroups", error);
        throw toSquadGroupOrpcError(error);
      }

      const groups = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as SquadBuilderPersistenceUnavailable;
        logSquadBuilderError(context, "listGlobalSquadGroups", mapped);
        return toSquadGroupOrpcError(mapped);
      });

      return { groups: groups.map(toGlobalSquadGroupDto) };
    }),
  listIncomingAccountInvites: verifiedProcedure.handler(async ({ context }) => {
    const actorUserId = parseAppUserId(context.session.user.id);

    if (isError(actorUserId)) {
      throw toOrpcError(actorUserId.error);
    }

    const services =
      listAccountSharingStateService === undefined
        ? defaultServices
        : ok({
            sharingState: listAccountSharingStateService,
          });

    if (isError(services)) {
      logSquadBuilderError(
        context,
        "listIncomingAccountInvites",
        services.error
      );
      throw toOrpcError(services.error);
    }

    const result = await services.value.sharingState.listIncomingInvites({
      actorUserId: actorUserId.value,
    });

    if (isError(result)) {
      logSquadBuilderError(context, "listIncomingAccountInvites", result.error);
      throw toAccountSharingOrpcError(result.error);
    }

    return {
      invites: result.value.map(toAccountAccessInviteDto),
    };
  }),
  listIncomingSquadGroupInvites: verifiedProcedure.handler(
    async ({ context }) => {
      const actorUserId = parseAppUserId(context.session.user.id);
      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }
      const services =
        listSquadGroupSharingStateService === undefined
          ? defaultServices
          : ok({
              squadGroupSharingState: listSquadGroupSharingStateService,
            });
      if (isError(services)) {
        logSquadBuilderError(
          context,
          "listIncomingSquadGroupInvites",
          services.error
        );
        throw toOrpcError(services.error);
      }
      const result =
        await services.value.squadGroupSharingState.listIncomingInvites({
          actorUserId: actorUserId.value,
        });
      if (isError(result)) {
        logSquadBuilderError(
          context,
          "listIncomingSquadGroupInvites",
          result.error
        );
        throw toSquadGroupOrpcError(result.error);
      }
      return { invites: result.value.map(toSquadGroupInvitationDto) };
    }
  ),
  listMySquadGroups: verifiedProcedure
    .output(listMySquadGroupsOutputSchema)
    .handler(async ({ context }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const effect = (
        listMySquadGroupsService ?? listSquadGroupsEffect
      ).listMine({
        actorUserId: actorUserId.value,
      });

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error("DATABASE_URL is required for listMySquadGroups"),
          operation: "listMySquadGroups",
        };
        logSquadBuilderError(context, "listMySquadGroups", error);
        throw toSquadGroupOrpcError(error);
      }

      const groups = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as ListMySquadGroupsError;
        logSquadBuilderError(context, "listMySquadGroups", mapped);
        return toSquadGroupOrpcError(mapped);
      });

      return { groups: groups.map(toSquadGroupSummaryDto) };
    }),
  listOwnedAccounts: verifiedProcedure.handler(async ({ context }) => {
    const actorUserId = parseAppUserId(context.session.user.id);

    if (isError(actorUserId)) {
      throw toOrpcError(actorUserId.error);
    }

    const effect = (listOwnedAccountsService ?? listOwnedAccountsEffect).list({
      actorUserId: actorUserId.value,
    });

    if (effectRuntime === undefined) {
      const error = {
        _tag: "SquadBuilderPersistenceUnavailable" as const,
        cause: new Error("DATABASE_URL is required for listOwnedAccounts"),
        operation: "listOwnedAccounts",
      };
      logSquadBuilderError(context, "listOwnedAccounts", error);
      throw toListOrpcError(error);
    }

    const accounts = await runOrpcEffect(effectRuntime, effect, (error) => {
      const mapped = error as ListOwnedMargonemAccountsError;
      logSquadBuilderError(context, "listOwnedAccounts", mapped);
      return toListOrpcError(mapped);
    });

    return toListOwnedAccountsResponse(accounts);
  }),
  listSharedAccounts: verifiedProcedure.handler(async ({ context }) => {
    const actorUserId = parseAppUserId(context.session.user.id);

    if (isError(actorUserId)) {
      throw toOrpcError(actorUserId.error);
    }

    const services =
      listAccountSharingStateService === undefined
        ? defaultServices
        : ok({
            sharingState: listAccountSharingStateService,
          });

    if (isError(services)) {
      logSquadBuilderError(context, "listSharedAccounts", services.error);
      throw toOrpcError(services.error);
    }

    const result = await services.value.sharingState.listSharedAccounts({
      actorUserId: actorUserId.value,
    });

    if (isError(result)) {
      logSquadBuilderError(context, "listSharedAccounts", result.error);
      throw toAccountSharingOrpcError(result.error);
    }

    return {
      accounts: result.value.map(toSharedMargonemAccountDto),
    };
  }),
  listSharedSquadGroups: verifiedProcedure
    .input(squadGroupListFiltersInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);
      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }
      const filters = parseSquadGroupListFilters(input?.filters ?? {});
      if (isError(filters)) {
        throw toSquadGroupOrpcError(filters.error);
      }
      const services =
        listSquadGroupSharingStateService === undefined
          ? defaultServices
          : ok({
              squadGroupSharingState: listSquadGroupSharingStateService,
            });
      if (isError(services)) {
        logSquadBuilderError(context, "listSharedSquadGroups", services.error);
        throw toOrpcError(services.error);
      }
      const result =
        await services.value.squadGroupSharingState.listSharedGroups({
          actorUserId: actorUserId.value,
          filters: filters.value,
        });
      if (isError(result)) {
        logSquadBuilderError(context, "listSharedSquadGroups", result.error);
        throw toSquadGroupOrpcError(result.error);
      }
      return { groups: result.value.map(toSharedSquadGroupDto) };
    }),
  listSquadGroupEditorGrants: verifiedProcedure
    .input(listSquadGroupEditorGrantsInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);
      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }
      const groupId = parseSquadGroupId(input.groupId);
      if (isError(groupId)) {
        throw toSquadGroupOrpcError(groupId.error);
      }
      const services =
        listSquadGroupSharingStateService === undefined
          ? defaultServices
          : ok({
              squadGroupSharingState: listSquadGroupSharingStateService,
            });
      if (isError(services)) {
        logSquadBuilderError(
          context,
          "listSquadGroupEditorGrants",
          services.error
        );
        throw toOrpcError(services.error);
      }
      const result =
        await services.value.squadGroupSharingState.listEditorGrants({
          actorUserId: actorUserId.value,
          groupId: groupId.value,
        });
      if (isError(result)) {
        logSquadBuilderError(
          context,
          "listSquadGroupEditorGrants",
          result.error
        );
        throw toSquadGroupOrpcError(result.error);
      }
      return { grants: result.value.map(toSquadGroupEditorGrantDto) };
    }),
  previewAccountRefetch: verifiedProcedure
    .input(previewAccountRefetchInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const accountId = parseMargonemAccountId(input.accountId);

      if (isError(accountId)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Nieprawidłowy identyfikator konta.",
        });
      }

      if (previewAccountRefetchService !== undefined) {
        const result = await previewAccountRefetchService.preview({
          accountId: accountId.value,
          actorUserId: actorUserId.value,
        });

        if (isError(result)) {
          logSquadBuilderError(context, "previewAccountRefetch", result.error);
          throw toAccountRefetchOrpcError(result.error);
        }

        return toPreviewAccountRefetchResponse(result.value);
      }

      const service =
        effectPreviewAccountRefetchService === undefined
          ? createDefaultPreviewAccountRefetchEffect()
          : ok(effectPreviewAccountRefetchService);

      if (isError(service)) {
        logSquadBuilderError(context, "previewAccountRefetch", service.error);
        throw toOrpcError(service.error);
      }

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error(
            "DATABASE_URL is required for previewAccountRefetch"
          ),
          operation: "previewAccountRefetch",
        };
        logSquadBuilderError(context, "previewAccountRefetch", error);
        throw toAccountRefetchOrpcError(error);
      }

      const preview = await runOrpcEffect(
        effectRuntime,
        service.value.preview({
          accountId: accountId.value,
          actorUserId: actorUserId.value,
        }),
        (error) => {
          const mapped = error as PreviewAccountRefetchError;
          logSquadBuilderError(context, "previewAccountRefetch", mapped);
          return toAccountRefetchOrpcError(mapped);
        }
      );

      return toPreviewAccountRefetchResponse(preview);
    }),
  previewOwnedAccountImports: verifiedProcedure
    .input(previewOwnedAccountImportsInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      if (previewOwnedImportsService !== undefined) {
        const result = await previewOwnedImportsService.preview({
          actorUserId: actorUserId.value,
          profileUrls: input.profileUrls,
        });

        if (isError(result)) {
          logSquadBuilderError(
            context,
            "previewOwnedAccountImports",
            result.error
          );
          throw toPreviewOwnedImportsOrpcError(result.error);
        }

        return {
          items: result.value.items.map(toPreviewOwnedAccountImportItemDto),
        };
      }

      const service =
        effectPreviewOwnedImportsService === undefined
          ? createDefaultPreviewOwnedAccountImportsEffect()
          : ok(effectPreviewOwnedImportsService);

      if (isError(service)) {
        logSquadBuilderError(
          context,
          "previewOwnedAccountImports",
          service.error
        );
        throw toOrpcError(service.error);
      }

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error(
            "DATABASE_URL is required for previewOwnedAccountImports"
          ),
          operation: "previewOwnedAccountImports",
        };
        logSquadBuilderError(context, "previewOwnedAccountImports", error);
        throw toPreviewOwnedImportsOrpcError(error);
      }

      const result = await runOrpcEffect(
        effectRuntime,
        service.value.preview({
          actorUserId: actorUserId.value,
          profileUrls: input.profileUrls,
        }),
        (error) => {
          const mapped = error as PreviewOwnedAccountImportsError;
          logSquadBuilderError(context, "previewOwnedAccountImports", mapped);
          return toPreviewOwnedImportsOrpcError(mapped);
        }
      );

      return {
        items: result.items.map(toPreviewOwnedAccountImportItemDto),
      };
    }),
  previewProfileImport: verifiedProcedure
    .input(previewProfileImportInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      if (previewService !== undefined) {
        const preview = await previewService.preview({
          actorUserId: actorUserId.value,
          profileUrl: input.profileUrl,
        });

        if (isError(preview)) {
          logSquadBuilderError(
            context,
            "previewMargonemProfileImport",
            preview.error
          );
          throw toOrpcError(preview.error);
        }

        return toPreviewProfileImportResponse(preview.value);
      }

      const service =
        effectPreviewService === undefined
          ? createDefaultPreviewProfileImportEffect()
          : ok(effectPreviewService);

      if (isError(service)) {
        logSquadBuilderError(
          context,
          "previewMargonemProfileImport",
          service.error
        );
        throw toOrpcError(service.error);
      }

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error(
            "DATABASE_URL is required for previewMargonemProfileImport"
          ),
          operation: "previewMargonemProfileImport",
        };
        logSquadBuilderError(context, "previewMargonemProfileImport", error);
        throw toOrpcError(error);
      }

      const preview = await runOrpcEffect(
        effectRuntime,
        service.value.preview({
          actorUserId: actorUserId.value,
          profileUrl: input.profileUrl,
        }),
        (error) => {
          const mapped = error as PreviewMargonemProfileImportError;
          logSquadBuilderError(context, "previewMargonemProfileImport", mapped);
          return toOrpcError(mapped);
        }
      );

      return toPreviewProfileImportResponse(preview);
    }),
  respondToAccountAccessInvite: verifiedProcedure
    .input(respondToAccountAccessInviteInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const accessId = parseMargonemAccountAccessId(input.accessId);

      if (isError(accessId)) {
        throw toAccountSharingOrpcError(accessId.error);
      }

      if (respondToAccountAccessInviteService !== undefined) {
        const result = await respondToAccountAccessInviteService.respond({
          accessId: accessId.value,
          actorUserId: actorUserId.value,
          response: input.response,
        });

        if (isError(result)) {
          logSquadBuilderError(
            context,
            "respondToAccountAccessInvite",
            result.error
          );
          throw toAccountSharingOrpcError(result.error);
        }

        return toAccountAccessInviteDto(result.value);
      }

      const effect = (
        effectRespondToAccountAccessInviteService ??
        respondToAccountAccessInviteEffect
      ).respond({
        accessId: accessId.value,
        actorUserId: actorUserId.value,
        response: input.response,
      });

      if (effectRuntime === undefined) {
        const mapped: SquadBuilderPersistenceUnavailable = {
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error(
            "DATABASE_URL is required for respondToAccountAccessInvite"
          ),
          operation: "respondToAccountAccessInvite",
        };
        logSquadBuilderError(context, "respondToAccountAccessInvite", mapped);
        throw toAccountSharingOrpcError(mapped);
      }

      const invite = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as AccountSharingError;
        logSquadBuilderError(context, "respondToAccountAccessInvite", mapped);
        return toAccountSharingOrpcError(mapped);
      });

      return toAccountAccessInviteDto(invite);
    }),
  respondToSquadGroupInvite: verifiedProcedure
    .input(respondToSquadGroupInviteInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);
      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }
      const invitationId = parseSquadGroupInvitationId(input.invitationId);
      if (isError(invitationId)) {
        throw toSquadGroupOrpcError(invitationId.error);
      }
      const services =
        respondToSquadGroupInviteService === undefined
          ? defaultServices
          : ok({
              respondToSquadGroupInvite: respondToSquadGroupInviteService,
            });
      if (isError(services)) {
        logSquadBuilderError(
          context,
          "respondToSquadGroupInvite",
          services.error
        );
        throw toOrpcError(services.error);
      }
      const result = await services.value.respondToSquadGroupInvite.respond({
        actorUserId: actorUserId.value,
        invitationId: invitationId.value,
        response: input.response,
      });
      if (isError(result)) {
        logSquadBuilderError(
          context,
          "respondToSquadGroupInvite",
          result.error
        );
        throw toSquadGroupOrpcError(result.error);
      }
      return toSquadGroupInvitationDto(result.value);
    }),
  revokeAccountAccess: verifiedProcedure
    .input(revokeAccountAccessInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const accessId = parseMargonemAccountAccessId(input.accessId);

      if (isError(accessId)) {
        throw toAccountSharingOrpcError(accessId.error);
      }

      if (revokeAccountAccessService !== undefined) {
        const result = await revokeAccountAccessService.revoke({
          accessId: accessId.value,
          actorUserId: actorUserId.value,
        });

        if (isError(result)) {
          logSquadBuilderError(context, "revokeAccountAccess", result.error);
          throw toAccountSharingOrpcError(result.error);
        }

        return {
          accessId: margonemAccountAccessIdToNumber(result.value.accessId),
          accountId: margonemAccountIdToNumber(result.value.accountId),
          removedSquadCharacterCount: result.value.removedSquadCharacterCount,
          revokedUserId: appUserIdToString(result.value.revokedUserId),
        };
      }

      const effect = (
        effectRevokeAccountAccessService ?? revokeAccountAccessEffect
      ).revoke({
        accessId: accessId.value,
        actorUserId: actorUserId.value,
      });

      if (effectRuntime === undefined) {
        const mapped: SquadBuilderPersistenceUnavailable = {
          _tag: "SquadBuilderPersistenceUnavailable",
          cause: new Error("DATABASE_URL is required for revokeAccountAccess"),
          operation: "revokeAccountAccess",
        };
        logSquadBuilderError(context, "revokeAccountAccess", mapped);
        throw toAccountSharingOrpcError(mapped);
      }

      const revoked = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as AccountSharingError;
        logSquadBuilderError(context, "revokeAccountAccess", mapped);
        return toAccountSharingOrpcError(mapped);
      });

      return {
        accessId: margonemAccountAccessIdToNumber(revoked.accessId),
        accountId: margonemAccountIdToNumber(revoked.accountId),
        removedSquadCharacterCount: revoked.removedSquadCharacterCount,
        revokedUserId: appUserIdToString(revoked.revokedUserId),
      };
    }),
  revokeSquadGroupEditor: verifiedProcedure
    .input(revokeSquadGroupEditorInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);
      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }
      const invitationId = parseSquadGroupInvitationId(input.invitationId);
      if (isError(invitationId)) {
        throw toSquadGroupOrpcError(invitationId.error);
      }
      const services =
        revokeSquadGroupEditorService === undefined
          ? defaultServices
          : ok({
              revokeSquadGroupEditor: revokeSquadGroupEditorService,
            });
      if (isError(services)) {
        logSquadBuilderError(context, "revokeSquadGroupEditor", services.error);
        throw toOrpcError(services.error);
      }
      const result = await services.value.revokeSquadGroupEditor.revoke({
        actorUserId: actorUserId.value,
        invitationId: invitationId.value,
      });
      if (isError(result)) {
        logSquadBuilderError(context, "revokeSquadGroupEditor", result.error);
        throw toSquadGroupOrpcError(result.error);
      }
      return toSquadGroupInvitationDto(result.value);
    }),
  saveSharedSquadGroupCharacters: verifiedProcedure
    .input(saveSharedSquadGroupCharactersInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);
      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }
      const groupId = parseSquadGroupId(input.groupId);
      if (isError(groupId)) {
        throw toSquadGroupOrpcError(groupId.error);
      }
      const squads = [];
      for (const squadInput of input.squads) {
        const squadId = parseSquadId(squadInput.squadId);
        if (isError(squadId)) {
          throw toSquadGroupOrpcError(squadId.error);
        }
        squads.push({
          characters: squadInput.characters,
          squadId: squadId.value,
        });
      }
      const services =
        saveSharedSquadGroupCharactersService === undefined
          ? defaultServices
          : ok({
              saveSharedSquadGroupCharacters:
                saveSharedSquadGroupCharactersService,
            });
      if (isError(services)) {
        logSquadBuilderError(
          context,
          "saveSharedSquadGroupCharacters",
          services.error
        );
        throw toOrpcError(services.error);
      }
      const result = await services.value.saveSharedSquadGroupCharacters.save({
        actorUserId: actorUserId.value,
        groupId: groupId.value,
        squads,
      });
      if (isError(result)) {
        logSquadBuilderError(
          context,
          "saveSharedSquadGroupCharacters",
          result.error
        );
        throw toSquadGroupOrpcError(result.error);
      }
      return toSquadGroupDetailDto(result.value);
    }),
  saveSquadGroup: verifiedProcedure
    .input(saveSquadGroupInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const groupId = parseSquadGroupId(input.groupId);
      if (isError(groupId)) {
        throw toSquadGroupOrpcError(groupId.error);
      }

      const squads: SaveSquadInput[] = [];
      for (const squadInput of input.squads) {
        const squadId =
          squadInput.squadId === undefined
            ? undefined
            : parseSquadId(squadInput.squadId);

        if (squadId !== undefined && isError(squadId)) {
          throw toSquadGroupOrpcError(squadId.error);
        }

        squads.push({
          characters: squadInput.characters,
          clientKey: squadInput.clientKey,
          name: squadInput.name,
          position: squadInput.position,
          ...(squadId === undefined ? {} : { squadId: squadId.value }),
        });
      }

      const services =
        saveSquadGroupService === undefined
          ? defaultServices
          : ok({
              saveSquadGroup: saveSquadGroupService,
            });

      if (isError(services)) {
        logSquadBuilderError(context, "saveSquadGroup", services.error);
        throw toOrpcError(services.error);
      }

      const result = await services.value.saveSquadGroup.save({
        actorUserId: actorUserId.value,
        groupId: groupId.value,
        name: input.name,
        squads,
      });

      if (isError(result)) {
        logSquadBuilderError(context, "saveSquadGroup", result.error);
        throw toSquadGroupOrpcError(result.error);
      }

      return toSquadGroupDetailDto(result.value);
    }),
  searchAccountInviteTargets: verifiedProcedure
    .input(searchAccountInviteTargetsInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const accountId = parseMargonemAccountId(input.accountId);

      if (isError(accountId)) {
        throw toAccountSharingOrpcError(accountId.error);
      }

      if (searchAccountInviteTargetsService !== undefined) {
        const result = await searchAccountInviteTargetsService.search({
          accountId: accountId.value,
          actorUserId: actorUserId.value,
          query: input.query,
        });

        if (isError(result)) {
          logSquadBuilderError(
            context,
            "searchAccountInviteTargets",
            result.error
          );
          throw toAccountSharingOrpcError(result.error);
        }

        return {
          users: result.value.map(toAccountInviteTargetDto),
        };
      }

      const effect = (
        effectSearchAccountInviteTargetsService ??
        searchAccountInviteTargetsEffect
      ).search({
        accountId: accountId.value,
        actorUserId: actorUserId.value,
        query: input.query,
      });

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error(
            "DATABASE_URL is required for searchAccountInviteTargets"
          ),
          operation: "searchAccountInviteTargets",
        };
        logSquadBuilderError(context, "searchAccountInviteTargets", error);
        throw toAccountSharingOrpcError(error);
      }

      const targets = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as AccountSharingError;
        logSquadBuilderError(context, "searchAccountInviteTargets", mapped);
        return toAccountSharingOrpcError(mapped);
      });

      return {
        users: targets.map(toAccountInviteTargetDto),
      };
    }),
  searchSquadEditorInviteTargets: verifiedProcedure
    .input(searchSquadEditorInviteTargetsInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);
      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }
      const groupId = parseSquadGroupId(input.groupId);
      if (isError(groupId)) {
        throw toSquadGroupOrpcError(groupId.error);
      }
      const services =
        searchSquadEditorInviteTargetsService === undefined
          ? defaultServices
          : ok({
              searchSquadEditorInviteTargets:
                searchSquadEditorInviteTargetsService,
            });
      if (isError(services)) {
        logSquadBuilderError(
          context,
          "searchSquadEditorInviteTargets",
          services.error
        );
        throw toOrpcError(services.error);
      }
      const result = await services.value.searchSquadEditorInviteTargets.search(
        {
          actorUserId: actorUserId.value,
          groupId: groupId.value,
          query: input.query,
        }
      );
      if (isError(result)) {
        logSquadBuilderError(
          context,
          "searchSquadEditorInviteTargets",
          result.error
        );
        throw toSquadGroupOrpcError(result.error);
      }
      return { users: result.value.map(toSquadEditorInviteTargetDto) };
    }),
  sendAccountAccessInvite: verifiedProcedure
    .input(sendAccountAccessInviteInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);

      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }

      const accountId = parseMargonemAccountId(input.accountId);

      if (isError(accountId)) {
        throw toAccountSharingOrpcError(accountId.error);
      }

      const invitedUserId = parseAppUserId(input.invitedUserId);

      if (isError(invitedUserId)) {
        throw toAccountSharingOrpcError(invitedUserId.error);
      }

      if (sendAccountAccessInviteService !== undefined) {
        const result = await sendAccountAccessInviteService.send({
          accountId: accountId.value,
          actorUserId: actorUserId.value,
          invitedUserId: invitedUserId.value,
        });

        if (isError(result)) {
          logSquadBuilderError(
            context,
            "sendAccountAccessInvite",
            result.error
          );
          throw toAccountSharingOrpcError(result.error);
        }

        return toAccountAccessInviteDto(result.value);
      }

      const effect = (
        effectSendAccountAccessInviteService ?? sendAccountAccessInviteEffect
      ).send({
        accountId: accountId.value,
        actorUserId: actorUserId.value,
        invitedUserId: invitedUserId.value,
      });

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error(
            "DATABASE_URL is required for sendAccountAccessInvite"
          ),
          operation: "sendAccountAccessInvite",
        };
        logSquadBuilderError(context, "sendAccountAccessInvite", error);
        throw toAccountSharingOrpcError(error);
      }

      const invite = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as AccountSharingError;
        logSquadBuilderError(context, "sendAccountAccessInvite", mapped);
        return toAccountSharingOrpcError(mapped);
      });

      return toAccountAccessInviteDto(invite);
    }),
  sendSquadGroupEditorInvite: verifiedProcedure
    .input(sendSquadGroupEditorInviteInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);
      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }
      const groupId = parseSquadGroupId(input.groupId);
      const invitedUserId = parseAppUserId(input.invitedUserId);
      if (isError(groupId)) {
        throw toSquadGroupOrpcError(groupId.error);
      }
      if (isError(invitedUserId)) {
        throw toSquadGroupOrpcError(invitedUserId.error);
      }
      const services =
        sendSquadGroupEditorInviteService === undefined
          ? defaultServices
          : ok({
              sendSquadGroupEditorInvite: sendSquadGroupEditorInviteService,
            });
      if (isError(services)) {
        logSquadBuilderError(
          context,
          "sendSquadGroupEditorInvite",
          services.error
        );
        throw toOrpcError(services.error);
      }
      const result = await services.value.sendSquadGroupEditorInvite.send({
        actorUserId: actorUserId.value,
        groupId: groupId.value,
        invitedUserId: invitedUserId.value,
      });
      if (isError(result)) {
        logSquadBuilderError(
          context,
          "sendSquadGroupEditorInvite",
          result.error
        );
        throw toSquadGroupOrpcError(result.error);
      }
      return toSquadGroupInvitationDto(result.value);
    }),
  setSquadGroupVisibility: verifiedProcedure
    .input(setSquadGroupVisibilityInputSchema)
    .handler(async ({ context, input }) => {
      const actorUserId = parseAppUserId(context.session.user.id);
      if (isError(actorUserId)) {
        throw toOrpcError(actorUserId.error);
      }
      const groupId = parseSquadGroupId(input.groupId);
      if (isError(groupId)) {
        throw toSquadGroupOrpcError(groupId.error);
      }
      const visibility = parseSquadGroupVisibility(input.visibility);
      if (isError(visibility)) {
        throw toSquadGroupOrpcError(visibility.error);
      }
      const effect = (
        setSquadGroupVisibilityService ?? setSquadGroupVisibilityEffect
      ).set({
        actorUserId: actorUserId.value,
        groupId: groupId.value,
        visibility: visibility.value,
      });

      if (effectRuntime === undefined) {
        const error = {
          _tag: "SquadBuilderPersistenceUnavailable" as const,
          cause: new Error(
            "DATABASE_URL is required for setSquadGroupVisibility"
          ),
          operation: "setSquadGroupVisibility" as const,
        };
        logSquadBuilderError(context, "setSquadGroupVisibility", error);
        throw toSquadGroupOrpcError(error);
      }

      const result = await runOrpcEffect(effectRuntime, effect, (error) => {
        const mapped = error as GlobalSquadVisibilityError;
        logSquadBuilderError(context, "setSquadGroupVisibility", mapped);
        return toSquadGroupOrpcError(mapped);
      });

      return {
        groupId: result.groupId,
        updatedAt: result.updatedAt.toISOString(),
        visibility: result.visibility,
      };
    }),
});

export const squadBuilderRouter = createSquadBuilderRouter();

import type { EffectDatabase } from "@tepirek-revamped/db/effect";
import {
  EffectDatabaseLiveFromConfig,
  makeLiveDatabaseLayer,
} from "@tepirek-revamped/db/effect";
import type { ConfigError } from "effect/Config";
import * as Layer from "effect/Layer";
import type { SqlError } from "effect/unstable/sql/SqlError";

import { AnnouncementStoreLayer } from "../adapters/announcement/announcement-store.ts";
import type { AnnouncementStore } from "../adapters/announcement/announcement-store.ts";
import { AuctionStoreLayer } from "../adapters/auction/auction-store.ts";
import type { AuctionStore } from "../adapters/auction/auction-store.ts";
import { EventStoreLayer } from "../adapters/event/event-store.ts";
import type { EventStore } from "../adapters/event/event-store.ts";
import { DrizzleBetServiceLayer } from "../adapters/hero-bet-ledger/drizzle-bet-service.ts";
import { DrizzleRankingServiceLayer } from "../adapters/hero-bet-ledger/drizzle-ranking-service.ts";
import { DrizzleVaultServiceLayer } from "../adapters/hero-bet-ledger/drizzle-vault-service.ts";
import { HeroesStoreLayer } from "../adapters/heroes/heroes-store.ts";
import type { HeroesStore } from "../adapters/heroes/heroes-store.ts";
import { SkillsStoreLayer } from "../adapters/skills/skills-store.ts";
import type { SkillsStore } from "../adapters/skills/skills-store.ts";
import { FirecrawlClientServiceLiveLayer } from "../adapters/squad-builder/firecrawl/firecrawl-client-service.ts";
import {
  FirecrawlConfigServiceLiveLayer,
  makeFirecrawlConfigLayer,
} from "../adapters/squad-builder/firecrawl/firecrawl-config.ts";
import { DrizzleSquadBuilderStoresLayer } from "../adapters/squad-builder/persistence/squad-builder-stores-layer.ts";
import { TodoStoreLayer } from "../adapters/todo/todo-store.ts";
import type { TodoStore } from "../adapters/todo/todo-store.ts";
import {
  DiscordVerificationConfig,
  makeDiscordVerificationConfigLayer,
} from "../adapters/user/discord-verification-config.ts";
import type { DiscordVerificationConfig as DiscordVerificationConfigService } from "../adapters/user/discord-verification-config.ts";
import { DiscordGuildVerifierLiveLayer } from "../adapters/user/discord-verification-service.ts";
import type { DiscordGuildVerifier } from "../adapters/user/discord-verification-service.ts";
import { UserStoreLayer } from "../adapters/user/user-store.ts";
import type { UserStore } from "../adapters/user/user-store.ts";
import type { BetService } from "../services/bet/bet-service.ts";
import type { RankingService } from "../services/ranking/ranking-service.ts";
import type { AccountImportStoreService } from "../services/squad-builder/account-import/account-import-store-service.ts";
import { layer as confirmOwnedAccountImportLayer } from "../services/squad-builder/account-import/confirm-owned-account-import-service.ts";
import type { ConfirmOwnedAccountImportService } from "../services/squad-builder/account-import/confirm-owned-account-import-service.ts";
import { DeleteOwnedAccountService } from "../services/squad-builder/account-import/delete-owned-account-service.ts";
import { layer as listOwnedMargonemAccountsLayer } from "../services/squad-builder/account-import/list-owned-margonem-accounts.ts";
import type { ListOwnedMargonemAccountsService } from "../services/squad-builder/account-import/list-owned-margonem-accounts.ts";
import { layer as previewMargonemProfileImportLayer } from "../services/squad-builder/account-import/preview-margonem-profile-import-service.ts";
import type { PreviewMargonemProfileImportService } from "../services/squad-builder/account-import/preview-margonem-profile-import-service.ts";
import { layer as previewOwnedAccountImportsLayer } from "../services/squad-builder/account-import/preview-owned-account-imports-service.ts";
import type { PreviewOwnedAccountImportsService } from "../services/squad-builder/account-import/preview-owned-account-imports-service.ts";
import { UpdateOwnedAccountDisplayNameService } from "../services/squad-builder/account-import/update-owned-account-display-name-service.ts";
import type { AccountRefetchStoreService } from "../services/squad-builder/account-refetch/account-refetch-store-service.ts";
import { layer as applyAccountRefetchLayer } from "../services/squad-builder/account-refetch/apply-account-refetch-service.ts";
import type { ApplyAccountRefetchService } from "../services/squad-builder/account-refetch/apply-account-refetch-service.ts";
import { layer as previewAccountRefetchLayer } from "../services/squad-builder/account-refetch/preview-account-refetch-service.ts";
import type { PreviewAccountRefetchService } from "../services/squad-builder/account-refetch/preview-account-refetch-service.ts";
import type { AccountSharingStoreService } from "../services/squad-builder/account-sharing/account-sharing-store-service.ts";
import type { AccountSharingStateService } from "../services/squad-builder/account-sharing/list-account-sharing-state-service.ts";
import { layer as accountSharingStateLayer } from "../services/squad-builder/account-sharing/list-account-sharing-state-service.ts";
import type { AccountAccessInviteResponsesService } from "../services/squad-builder/account-sharing/respond-to-account-access-invite-service.ts";
import { layer as accountAccessInviteResponsesLayer } from "../services/squad-builder/account-sharing/respond-to-account-access-invite-service.ts";
import type { AccountAccessRevocationsService } from "../services/squad-builder/account-sharing/revoke-account-access-service.ts";
import { layer as accountAccessRevocationsLayer } from "../services/squad-builder/account-sharing/revoke-account-access-service.ts";
import type { AccountInviteTargetsService } from "../services/squad-builder/account-sharing/search-account-invite-targets-service.ts";
import { layer as accountInviteTargetsLayer } from "../services/squad-builder/account-sharing/search-account-invite-targets-service.ts";
import type { AccountAccessInvitesService } from "../services/squad-builder/account-sharing/send-account-access-invite-service.ts";
import { layer as accountAccessInvitesLayer } from "../services/squad-builder/account-sharing/send-account-access-invite-service.ts";
import type { FirecrawlClientService } from "../services/squad-builder/firecrawl-client.ts";
import type {
  FirecrawlConfig,
  FirecrawlConfigService,
} from "../services/squad-builder/firecrawl-config.ts";
import { layer as createSquadGroupLayer } from "../services/squad-builder/squad-groups/create-squad-group.ts";
import type { CreateSquadGroupService } from "../services/squad-builder/squad-groups/create-squad-group.ts";
import { layer as deleteSquadGroupLayer } from "../services/squad-builder/squad-groups/delete-squad-group.ts";
import type { DeleteSquadGroupService } from "../services/squad-builder/squad-groups/delete-squad-group.ts";
import { layer as listAvailableSquadCharactersLayer } from "../services/squad-builder/squad-groups/list-available-squad-characters.ts";
import type { ListAvailableSquadCharactersService } from "../services/squad-builder/squad-groups/list-available-squad-characters.ts";
import { layer as listGlobalSquadGroupsLayer } from "../services/squad-builder/squad-groups/list-global-squad-groups.ts";
import type { ListGlobalSquadGroupsService } from "../services/squad-builder/squad-groups/list-global-squad-groups.ts";
import type { SquadGroupSharingStateService } from "../services/squad-builder/squad-groups/list-squad-group-sharing-state-service.ts";
import { layer as squadGroupSharingStateLayer } from "../services/squad-builder/squad-groups/list-squad-group-sharing-state-service.ts";
import { layer as listSquadGroupsLayer } from "../services/squad-builder/squad-groups/list-squad-groups.ts";
import type { ListSquadGroupsService } from "../services/squad-builder/squad-groups/list-squad-groups.ts";
import type { SquadGroupEditorInviteResponsesService } from "../services/squad-builder/squad-groups/respond-to-squad-group-invite-service.ts";
import { layer as squadGroupEditorInviteResponsesLayer } from "../services/squad-builder/squad-groups/respond-to-squad-group-invite-service.ts";
import type { SquadGroupEditorRevocationsService } from "../services/squad-builder/squad-groups/revoke-squad-group-editor-service.ts";
import { layer as squadGroupEditorRevocationsLayer } from "../services/squad-builder/squad-groups/revoke-squad-group-editor-service.ts";
import { layer as saveSharedSquadGroupCharactersLayer } from "../services/squad-builder/squad-groups/save-shared-squad-group-characters.ts";
import type { SaveSharedSquadGroupCharactersService } from "../services/squad-builder/squad-groups/save-shared-squad-group-characters.ts";
import { layer as saveSquadGroupLayer } from "../services/squad-builder/squad-groups/save-squad-group.ts";
import type { SaveSquadGroupService } from "../services/squad-builder/squad-groups/save-squad-group.ts";
import type { SquadEditorInviteTargetsService } from "../services/squad-builder/squad-groups/search-squad-editor-invite-targets-service.ts";
import { layer as squadEditorInviteTargetsLayer } from "../services/squad-builder/squad-groups/search-squad-editor-invite-targets-service.ts";
import type { SquadGroupEditorInvitesService } from "../services/squad-builder/squad-groups/send-squad-group-editor-invite-service.ts";
import { layer as squadGroupEditorInvitesLayer } from "../services/squad-builder/squad-groups/send-squad-group-editor-invite-service.ts";
import { layer as setSquadGroupVisibilityLayer } from "../services/squad-builder/squad-groups/set-squad-group-visibility.ts";
import type { SetSquadGroupVisibilityService } from "../services/squad-builder/squad-groups/set-squad-group-visibility.ts";
import type { SquadGroupStoreService } from "../services/squad-builder/squad-groups/squad-group-store.ts";
import type { VaultService } from "../services/vault/vault-service.ts";

const makeApiStableLayer = (
  databaseLayer: Layer.Layer<EffectDatabase, SqlError | ConfigError, never>,
  discordConfigLayer = DiscordVerificationConfig.layer,
  firecrawlConfigLayer = FirecrawlConfigServiceLiveLayer
): Layer.Layer<SquadBuilderServices, SqlError | ConfigError> => {
  const databaseBackedStores = Layer.mergeAll(
    AnnouncementStoreLayer.pipe(Layer.provide(databaseLayer)),
    TodoStoreLayer.pipe(Layer.provide(databaseLayer)),
    HeroesStoreLayer.pipe(Layer.provide(databaseLayer)),
    DrizzleBetServiceLayer.pipe(Layer.provide(databaseLayer)),
    DrizzleRankingServiceLayer.pipe(Layer.provide(databaseLayer)),
    DrizzleVaultServiceLayer.pipe(Layer.provide(databaseLayer)),
    EventStoreLayer.pipe(Layer.provide(databaseLayer)),
    SkillsStoreLayer.pipe(Layer.provide(databaseLayer)),
    AuctionStoreLayer.pipe(Layer.provide(databaseLayer)),
    UserStoreLayer.pipe(Layer.provide(databaseLayer)),
    discordConfigLayer,
    DiscordGuildVerifierLiveLayer.pipe(Layer.provide(discordConfigLayer))
  );

  const squadBuilderStores = DrizzleSquadBuilderStoresLayer.pipe(
    Layer.provide(databaseLayer)
  );

  const squadBuilderSharing = Layer.mergeAll(
    squadBuilderStores,
    accountInviteTargetsLayer.pipe(Layer.provide(squadBuilderStores)),
    accountAccessInvitesLayer.pipe(Layer.provide(squadBuilderStores)),
    accountAccessInviteResponsesLayer.pipe(Layer.provide(squadBuilderStores)),
    accountAccessRevocationsLayer.pipe(Layer.provide(squadBuilderStores)),
    accountSharingStateLayer.pipe(Layer.provide(squadBuilderStores)),
    squadEditorInviteTargetsLayer.pipe(Layer.provide(squadBuilderStores)),
    squadGroupEditorInvitesLayer.pipe(Layer.provide(squadBuilderStores)),
    squadGroupEditorInviteResponsesLayer.pipe(
      Layer.provide(squadBuilderStores)
    ),
    squadGroupEditorRevocationsLayer.pipe(Layer.provide(squadBuilderStores)),
    squadGroupSharingStateLayer.pipe(Layer.provide(squadBuilderStores))
  );

  const firecrawlLayer = Layer.mergeAll(
    firecrawlConfigLayer,
    FirecrawlClientServiceLiveLayer.pipe(Layer.provide(firecrawlConfigLayer))
  );

  const stableServices = Layer.mergeAll(
    databaseBackedStores,
    squadBuilderSharing,
    firecrawlLayer
  );

  const squadBuilderUseCases = Layer.mergeAll(
    createSquadGroupLayer,
    deleteSquadGroupLayer,
    listAvailableSquadCharactersLayer,
    listSquadGroupsLayer,
    listGlobalSquadGroupsLayer,
    saveSquadGroupLayer,
    saveSharedSquadGroupCharactersLayer,
    setSquadGroupVisibilityLayer,
    previewMargonemProfileImportLayer,
    previewOwnedAccountImportsLayer,
    confirmOwnedAccountImportLayer,
    listOwnedMargonemAccountsLayer,
    DeleteOwnedAccountService.layer,
    UpdateOwnedAccountDisplayNameService.layer,
    previewAccountRefetchLayer,
    applyAccountRefetchLayer
  );

  return Layer.mergeAll(
    stableServices,
    squadBuilderUseCases.pipe(Layer.provideMerge(stableServices))
  );
};

export const makeApiSquadBuilderLayer = (databaseUrl: string) => {
  const databaseLayer = makeLiveDatabaseLayer(databaseUrl);
  return makeApiStableLayer(databaseLayer);
};

export const makeApiLiveLayer = (databaseUrl: string) =>
  makeApiStableLayer(makeLiveDatabaseLayer(databaseUrl));

/** Build API services from configuration parsed by an executable boundary. */
export const makeApiLiveLayerFromValues = (config: {
  readonly databaseUrl: string;
  readonly discordGuildId: string;
  readonly firecrawl: FirecrawlConfig;
}) =>
  makeApiStableLayer(
    makeLiveDatabaseLayer(config.databaseUrl),
    makeDiscordVerificationConfigLayer({ guildId: config.discordGuildId }),
    makeFirecrawlConfigLayer(config.firecrawl)
  );

/**
 * Build the full API live layer using Effect Config to read `DATABASE_URL`.
 *
 * Reads `DATABASE_URL` through `EffectDatabaseLiveFromConfig` at the
 * composition root rather than a raw process.env read.
 */
export const makeApiLiveLayerFromConfig = () =>
  makeApiStableLayer(EffectDatabaseLiveFromConfig);

type SquadBuilderServices =
  | AnnouncementStore
  | TodoStore
  | HeroesStore
  | BetService
  | RankingService
  | VaultService
  | EventStore
  | SkillsStore
  | AuctionStore
  | UserStore
  | DiscordGuildVerifier
  | DiscordVerificationConfigService
  | SquadGroupStoreService
  | AccountImportStoreService
  | AccountRefetchStoreService
  | AccountSharingStoreService
  | FirecrawlClientService
  | FirecrawlConfigService
  | AccountInviteTargetsService
  | AccountAccessInvitesService
  | AccountAccessInviteResponsesService
  | AccountAccessRevocationsService
  | AccountSharingStateService
  | SquadEditorInviteTargetsService
  | SquadGroupEditorInvitesService
  | SquadGroupEditorInviteResponsesService
  | SquadGroupEditorRevocationsService
  | SquadGroupSharingStateService
  | CreateSquadGroupService
  | DeleteSquadGroupService
  | ListAvailableSquadCharactersService
  | ListSquadGroupsService
  | ListGlobalSquadGroupsService
  | SaveSquadGroupService
  | SaveSharedSquadGroupCharactersService
  | SetSquadGroupVisibilityService
  | PreviewMargonemProfileImportService
  | PreviewOwnedAccountImportsService
  | ConfirmOwnedAccountImportService
  | ListOwnedMargonemAccountsService
  | DeleteOwnedAccountService
  | UpdateOwnedAccountDisplayNameService
  | PreviewAccountRefetchService
  | ApplyAccountRefetchService;

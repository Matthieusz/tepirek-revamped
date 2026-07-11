import type { EffectDatabase } from "@tepirek-revamped/db/effect";
import {
  EffectDatabaseLiveFromConfig,
  makeLiveDatabaseLayer,
} from "@tepirek-revamped/db/effect";
import type { ConfigError } from "effect/Config";
import * as Layer from "effect/Layer";
import type { SqlError } from "effect/unstable/sql/SqlError";

import { AnnouncementStoreLayer } from "../adapters/announcement/announcement-store.js";
import type { AnnouncementStore } from "../adapters/announcement/announcement-store.js";
import { AuctionStoreLayer } from "../adapters/auction/auction-store.js";
import type { AuctionStore } from "../adapters/auction/auction-store.js";
import { EventStoreLayer } from "../adapters/event/event-store.js";
import type { EventStore } from "../adapters/event/event-store.js";
import { DrizzleBetServiceLayer } from "../adapters/hero-bet-ledger/drizzle-bet-service.js";
import { DrizzleRankingServiceLayer } from "../adapters/hero-bet-ledger/drizzle-ranking-service.js";
import { DrizzleVaultServiceLayer } from "../adapters/hero-bet-ledger/drizzle-vault-service.js";
import { HeroesStoreLayer } from "../adapters/heroes/heroes-store.js";
import type { HeroesStore } from "../adapters/heroes/heroes-store.js";
import { SkillsStoreLayer } from "../adapters/skills/skills-store.js";
import type { SkillsStore } from "../adapters/skills/skills-store.js";
import { FirecrawlClientServiceLiveLayer } from "../adapters/squad-builder/firecrawl/firecrawl-client-service.js";
import { FirecrawlConfigServiceLiveLayer } from "../adapters/squad-builder/firecrawl/firecrawl-config.js";
import { DrizzleSquadBuilderStoresLayer } from "../adapters/squad-builder/persistence/squad-builder-stores-layer.js";
import { TodoStoreLayer } from "../adapters/todo/todo-store.js";
import type { TodoStore } from "../adapters/todo/todo-store.js";
import { DiscordVerificationConfig } from "../adapters/user/discord-verification-config.js";
import type { DiscordVerificationConfig as DiscordVerificationConfigService } from "../adapters/user/discord-verification-config.js";
import { DiscordGuildVerifierLiveLayer } from "../adapters/user/discord-verification-service.js";
import type { DiscordGuildVerifier } from "../adapters/user/discord-verification-service.js";
import { UserStoreLayer } from "../adapters/user/user-store.js";
import type { UserStore } from "../adapters/user/user-store.js";
import type { BetService } from "../services/bet/bet-service.js";
import type { RankingService } from "../services/ranking/ranking-service.js";
import type { AccountImportStoreService } from "../services/squad-builder/account-import/account-import-store-service.js";
import { layer as confirmOwnedAccountImportLayer } from "../services/squad-builder/account-import/confirm-owned-account-import-service.js";
import type { ConfirmOwnedAccountImportService } from "../services/squad-builder/account-import/confirm-owned-account-import-service.js";
import { layer as previewMargonemProfileImportLayer } from "../services/squad-builder/account-import/preview-margonem-profile-import-service.js";
import type { PreviewMargonemProfileImportService } from "../services/squad-builder/account-import/preview-margonem-profile-import-service.js";
import { layer as previewOwnedAccountImportsLayer } from "../services/squad-builder/account-import/preview-owned-account-imports-service.js";
import type { PreviewOwnedAccountImportsService } from "../services/squad-builder/account-import/preview-owned-account-imports-service.js";
import type { AccountRefetchStoreService } from "../services/squad-builder/account-refetch/account-refetch-store-service.js";
import { layer as applyAccountRefetchLayer } from "../services/squad-builder/account-refetch/apply-account-refetch-service.js";
import type { ApplyAccountRefetchService } from "../services/squad-builder/account-refetch/apply-account-refetch-service.js";
import { layer as previewAccountRefetchLayer } from "../services/squad-builder/account-refetch/preview-account-refetch-service.js";
import type { PreviewAccountRefetchService } from "../services/squad-builder/account-refetch/preview-account-refetch-service.js";
import type { AccountSharingStoreService } from "../services/squad-builder/account-sharing/account-sharing-store-service.js";
import type { AccountSharingStateService } from "../services/squad-builder/account-sharing/list-account-sharing-state-service.js";
import { layer as accountSharingStateLayer } from "../services/squad-builder/account-sharing/list-account-sharing-state-service.js";
import type { AccountAccessInviteResponsesService } from "../services/squad-builder/account-sharing/respond-to-account-access-invite-service.js";
import { layer as accountAccessInviteResponsesLayer } from "../services/squad-builder/account-sharing/respond-to-account-access-invite-service.js";
import type { AccountAccessRevocationsService } from "../services/squad-builder/account-sharing/revoke-account-access-service.js";
import { layer as accountAccessRevocationsLayer } from "../services/squad-builder/account-sharing/revoke-account-access-service.js";
import type { AccountInviteTargetsService } from "../services/squad-builder/account-sharing/search-account-invite-targets-service.js";
import { layer as accountInviteTargetsLayer } from "../services/squad-builder/account-sharing/search-account-invite-targets-service.js";
import type { AccountAccessInvitesService } from "../services/squad-builder/account-sharing/send-account-access-invite-service.js";
import { layer as accountAccessInvitesLayer } from "../services/squad-builder/account-sharing/send-account-access-invite-service.js";
import type { FirecrawlClientService } from "../services/squad-builder/firecrawl-client.js";
import type { FirecrawlConfigService } from "../services/squad-builder/firecrawl-config.js";
import { layer as createSquadGroupLayer } from "../services/squad-builder/squad-groups/create-squad-group.js";
import type { CreateSquadGroupService } from "../services/squad-builder/squad-groups/create-squad-group.js";
import { layer as listGlobalSquadGroupsLayer } from "../services/squad-builder/squad-groups/list-global-squad-groups.js";
import type { ListGlobalSquadGroupsService } from "../services/squad-builder/squad-groups/list-global-squad-groups.js";
import type { SquadGroupSharingStateService } from "../services/squad-builder/squad-groups/list-squad-group-sharing-state-service.js";
import { layer as squadGroupSharingStateLayer } from "../services/squad-builder/squad-groups/list-squad-group-sharing-state-service.js";
import { layer as listSquadGroupsLayer } from "../services/squad-builder/squad-groups/list-squad-groups.js";
import type { ListSquadGroupsService } from "../services/squad-builder/squad-groups/list-squad-groups.js";
import type { SquadGroupEditorInviteResponsesService } from "../services/squad-builder/squad-groups/respond-to-squad-group-invite-service.js";
import { layer as squadGroupEditorInviteResponsesLayer } from "../services/squad-builder/squad-groups/respond-to-squad-group-invite-service.js";
import type { SquadGroupEditorRevocationsService } from "../services/squad-builder/squad-groups/revoke-squad-group-editor-service.js";
import { layer as squadGroupEditorRevocationsLayer } from "../services/squad-builder/squad-groups/revoke-squad-group-editor-service.js";
import { layer as saveSharedSquadGroupCharactersLayer } from "../services/squad-builder/squad-groups/save-shared-squad-group-characters.js";
import type { SaveSharedSquadGroupCharactersService } from "../services/squad-builder/squad-groups/save-shared-squad-group-characters.js";
import { layer as saveSquadGroupLayer } from "../services/squad-builder/squad-groups/save-squad-group.js";
import type { SaveSquadGroupService } from "../services/squad-builder/squad-groups/save-squad-group.js";
import type { SquadEditorInviteTargetsService } from "../services/squad-builder/squad-groups/search-squad-editor-invite-targets-service.js";
import { layer as squadEditorInviteTargetsLayer } from "../services/squad-builder/squad-groups/search-squad-editor-invite-targets-service.js";
import type { SquadGroupEditorInvitesService } from "../services/squad-builder/squad-groups/send-squad-group-editor-invite-service.js";
import { layer as squadGroupEditorInvitesLayer } from "../services/squad-builder/squad-groups/send-squad-group-editor-invite-service.js";
import { layer as setSquadGroupVisibilityLayer } from "../services/squad-builder/squad-groups/set-squad-group-visibility.js";
import type { SetSquadGroupVisibilityService } from "../services/squad-builder/squad-groups/set-squad-group-visibility.js";
import type { SquadGroupStoreService } from "../services/squad-builder/squad-groups/squad-group-store.js";
import type { VaultService } from "../services/vault/vault-service.js";

const makeApiStableLayer = (
  databaseLayer: Layer.Layer<EffectDatabase, SqlError | ConfigError, never>
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
    DiscordVerificationConfig.layer,
    DiscordGuildVerifierLiveLayer.pipe(
      Layer.provide(DiscordVerificationConfig.layer)
    )
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
    FirecrawlConfigServiceLiveLayer,
    FirecrawlClientServiceLiveLayer.pipe(
      Layer.provide(FirecrawlConfigServiceLiveLayer)
    )
  );

  const stableServices = Layer.mergeAll(
    databaseBackedStores,
    squadBuilderSharing,
    firecrawlLayer
  );

  const squadBuilderUseCases = Layer.mergeAll(
    createSquadGroupLayer,
    listSquadGroupsLayer,
    listGlobalSquadGroupsLayer,
    saveSquadGroupLayer,
    saveSharedSquadGroupCharactersLayer,
    setSquadGroupVisibilityLayer,
    previewMargonemProfileImportLayer,
    previewOwnedAccountImportsLayer,
    confirmOwnedAccountImportLayer,
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
  | ListSquadGroupsService
  | ListGlobalSquadGroupsService
  | SaveSquadGroupService
  | SaveSharedSquadGroupCharactersService
  | SetSquadGroupVisibilityService
  | PreviewMargonemProfileImportService
  | PreviewOwnedAccountImportsService
  | ConfirmOwnedAccountImportService
  | PreviewAccountRefetchService
  | ApplyAccountRefetchService;

import type { EffectDatabase } from "@tepirek-revamped/db/effect";
import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/unstable/http/FetchHttpClient";

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
import { FirecrawlClientServiceLiveLayer } from "../adapters/squad-builder/firecrawl/firecrawl-client.ts";
import { makeFirecrawlConfigLayer } from "../adapters/squad-builder/firecrawl/firecrawl-config.ts";
import { DrizzleAccountImportStoreServiceLayer } from "../adapters/squad-builder/persistence/account-import-store.ts";
import { DrizzleAccountRefetchStoreServiceLayer } from "../adapters/squad-builder/persistence/account-refetch-store.ts";
import { DrizzleAccountSharingStoreServiceLayer } from "../adapters/squad-builder/persistence/account-sharing-store.ts";
import { DrizzleFirecrawlRequestAccountingStoreServiceLayer } from "../adapters/squad-builder/persistence/firecrawl-request-accounting-store.ts";
import { DrizzleSquadGroupAggregateStoreServiceLayer } from "../adapters/squad-builder/persistence/squad-group-aggregate-store.ts";
import { DrizzleSquadGroupDirectoryStoreServiceLayer } from "../adapters/squad-builder/persistence/squad-group-directory-store.ts";
import { DrizzleSquadGroupSharingStoreServiceLayer } from "../adapters/squad-builder/persistence/squad-group-sharing-store.ts";
import { TodoStoreLayer } from "../adapters/todo/todo-store.ts";
import type { TodoStore } from "../adapters/todo/todo-store.ts";
import { makeDiscordVerificationConfigLayer } from "../adapters/user/discord-verification-config.ts";
import type { DiscordVerificationConfig as DiscordVerificationConfigService } from "../adapters/user/discord-verification-config.ts";
import { DiscordGuildVerifierLiveLayer } from "../adapters/user/discord-verification-service.ts";
import type { DiscordGuildVerifier } from "../adapters/user/discord-verification-service.ts";
import { UserStoreLayer } from "../adapters/user/user-store.ts";
import type { UserStore } from "../adapters/user/user-store.ts";
import type { BetService } from "../services/bet/bet-service.ts";
import type { RankingService } from "../services/ranking/ranking-service.ts";
import type { AccountImportStoreService } from "../services/squad-builder/account-import/account-import-store.ts";
import type { AccountRefetchStoreService } from "../services/squad-builder/account-refetch/account-refetch-store.ts";
import type { AccountSharingStoreService } from "../services/squad-builder/account-sharing/account-sharing-store.ts";
import type { FirecrawlClientService } from "../services/squad-builder/firecrawl-client.ts";
import type {
  FirecrawlConfig,
  FirecrawlConfigService,
} from "../services/squad-builder/firecrawl-config.ts";
import type { FirecrawlRequestAccountingStoreService } from "../services/squad-builder/firecrawl-request-accounting-store.ts";
import type { SquadGroupAggregateStoreService } from "../services/squad-builder/squad-groups/squad-group-aggregate-store.ts";
import type { SquadGroupDirectoryStoreService } from "../services/squad-builder/squad-groups/squad-group-directory-store.ts";
import type { SquadGroupSharingStoreService } from "../services/squad-builder/squad-groups/squad-group-sharing-store.ts";
import type { VaultService } from "../services/vault/vault-service.ts";

const makeApiStableLayer = <DatabaseError>(
  databaseLayer: Layer.Layer<EffectDatabase, DatabaseError>,
  discordConfigLayer: Layer.Layer<DiscordVerificationConfigService>,
  firecrawlConfigLayer: Layer.Layer<FirecrawlConfigService>
): Layer.Layer<SquadBuilderServices, DatabaseError> => {
  const discordVerifierLayer = DiscordGuildVerifierLiveLayer.pipe(
    Layer.provide(Layer.merge(discordConfigLayer, FetchHttpClient.layer))
  );

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
    discordVerifierLayer
  );

  const squadBuilderStores = Layer.mergeAll(
    DrizzleAccountImportStoreServiceLayer,
    DrizzleAccountRefetchStoreServiceLayer,
    DrizzleAccountSharingStoreServiceLayer,
    DrizzleFirecrawlRequestAccountingStoreServiceLayer,
    DrizzleSquadGroupAggregateStoreServiceLayer,
    DrizzleSquadGroupDirectoryStoreServiceLayer,
    DrizzleSquadGroupSharingStoreServiceLayer
  ).pipe(Layer.provide(databaseLayer));

  const firecrawlLayer = Layer.mergeAll(
    firecrawlConfigLayer,
    FirecrawlClientServiceLiveLayer.pipe(Layer.provide(firecrawlConfigLayer))
  );

  const stableServices = Layer.mergeAll(
    databaseBackedStores,
    squadBuilderStores,
    firecrawlLayer
  );

  return stableServices;
};

/** Build API services from parsed values and an executable-owned database. */
export const makeApiLiveLayerFromDatabase = <DatabaseError>(
  databaseLayer: Layer.Layer<EffectDatabase, DatabaseError>,
  config: {
    readonly discordGuildId: string;
    readonly firecrawl: FirecrawlConfig;
  }
) =>
  makeApiStableLayer(
    databaseLayer,
    makeDiscordVerificationConfigLayer({ guildId: config.discordGuildId }),
    makeFirecrawlConfigLayer(config.firecrawl)
  );

/** Build API services from configuration parsed by an executable boundary. */
export const makeApiLiveLayerFromValues = (config: {
  readonly databaseUrl: string;
  readonly discordGuildId: string;
  readonly firecrawl: FirecrawlConfig;
}) =>
  makeApiLiveLayerFromDatabase(makeLiveDatabaseLayer(config.databaseUrl), {
    discordGuildId: config.discordGuildId,
    firecrawl: config.firecrawl,
  });

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
  | SquadGroupAggregateStoreService
  | SquadGroupDirectoryStoreService
  | SquadGroupSharingStoreService
  | AccountImportStoreService
  | AccountRefetchStoreService
  | AccountSharingStoreService
  | FirecrawlClientService
  | FirecrawlConfigService
  | FirecrawlRequestAccountingStoreService;

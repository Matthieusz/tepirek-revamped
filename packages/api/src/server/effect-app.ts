import type { EffectDatabase } from "@tepirek-revamped/db/effect";
import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";

import { DrizzleLegendCatalogStoreServiceLayer } from "../adapters/legend-pricing/drizzle-legend-catalog-store.ts";
import { DrizzleLegendPricingStoreLayer } from "../adapters/legend-pricing/drizzle-legend-pricing-store.ts";
import { MargonemForumClientLiveLayer } from "../adapters/legend-pricing/margonem-forum/margonem-forum-client.ts";
import { FirecrawlClientServiceLiveLayer } from "../adapters/squad-builder/firecrawl/firecrawl-client.ts";
import { buildFirecrawlConfigLayer } from "../adapters/squad-builder/firecrawl/firecrawl-config.ts";
import { DrizzleFirecrawlRequestAccountingStoreServiceLayer } from "../adapters/squad-builder/persistence/firecrawl-request-accounting-store.ts";
import { buildDiscordVerificationConfigLayer } from "../adapters/user/discord-verification-config.ts";
import type { DiscordVerificationConfig as DiscordVerificationConfigService } from "../adapters/user/discord-verification-config.ts";
import type { AnnouncementStore } from "../services/announcement/announcement-store.ts";
import type { AuctionStore } from "../services/auction/auction-store.ts";
import type { BetService } from "../services/bet/bet-service.ts";
import type { EventStore } from "../services/event/event-store.ts";
import type { HeroesStore } from "../services/heroes/heroes-store.ts";
import { LegendCatalogSyncLiveLayer } from "../services/legend-pricing/legend-catalog-sync.ts";
import type { LegendPricingStore } from "../services/legend-pricing/legend-pricing-store.ts";
import type { RankingService } from "../services/ranking/ranking-service.ts";
import type { SkillsStore } from "../services/skills/skills-store.ts";
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
import type { TodoStore } from "../services/todo/todo-store.ts";
import type { DiscordGuildVerifier } from "../services/user/discord-guild-verifier.ts";
import type { UserStore } from "../services/user/user-store.ts";
import type { VaultService } from "../services/vault/vault-service.ts";
import { GuildLedgerLiveLayer } from "./guild-ledger/live.ts";
import { GuildToolsLiveLayer } from "./guild-tools/live.ts";
import { SquadBuilderLiveLayer } from "./squad-builder/live.ts";

const makeApiStableLayer = <DatabaseError>(
  databaseLayer: Layer.Layer<EffectDatabase, DatabaseError>,
  discordConfigLayer: Layer.Layer<DiscordVerificationConfigService>,
  firecrawlConfigLayer: Layer.Layer<FirecrawlConfigService>
): Layer.Layer<ApplicationServices, DatabaseError> =>
  Layer.mergeAll(
    GuildToolsLiveLayer,
    GuildLedgerLiveLayer,
    SquadBuilderLiveLayer,
    DrizzleLegendPricingStoreLayer
  ).pipe(
    Layer.provide(databaseLayer),
    Layer.provide(discordConfigLayer),
    // Scraping workflows also consume the configuration directly.
    Layer.provideMerge(firecrawlConfigLayer)
  );

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
    buildDiscordVerificationConfigLayer({ guildId: config.discordGuildId }),
    buildFirecrawlConfigLayer(config.firecrawl)
  );

/** Build the explicitly invoked forum-catalog synchronization graph. */
export const makeLegendCatalogSyncLayer = <DatabaseError>(
  databaseLayer: Layer.Layer<EffectDatabase, DatabaseError>,
  firecrawlConfig: FirecrawlConfig
) => {
  const firecrawlConfigLayer = buildFirecrawlConfigLayer(firecrawlConfig);

  const firecrawlClientLayer = FirecrawlClientServiceLiveLayer.pipe(
    Layer.provide(Layer.merge(firecrawlConfigLayer, FetchHttpClient.layer))
  );

  const accountingLayer =
    DrizzleFirecrawlRequestAccountingStoreServiceLayer.pipe(
      Layer.provide(databaseLayer)
    );

  return LegendCatalogSyncLiveLayer.pipe(
    Layer.provide(
      MargonemForumClientLiveLayer.pipe(
        Layer.provide(
          Layer.mergeAll(
            firecrawlClientLayer,
            firecrawlConfigLayer,
            accountingLayer
          )
        )
      )
    ),
    Layer.provide(
      DrizzleLegendCatalogStoreServiceLayer.pipe(Layer.provide(databaseLayer))
    )
  );
};

export { LegendCatalogSyncService } from "../services/legend-pricing/legend-catalog-sync.ts";

/** Build API services from configuration parsed by an executable boundary. */
export const buildApiLiveLayerFromValues = (config: {
  readonly databaseUrl: string;
  readonly discordGuildId: string;
  readonly firecrawl: FirecrawlConfig;
}) =>
  makeApiLiveLayerFromDatabase(makeLiveDatabaseLayer(config.databaseUrl), {
    discordGuildId: config.discordGuildId,
    firecrawl: config.firecrawl,
  });

type ApplicationServices =
  | AnnouncementStore
  | TodoStore
  | HeroesStore
  | BetService
  | RankingService
  | VaultService
  | LegendPricingStore
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

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
import { LegendCatalogSyncLiveLayer } from "../services/legend-pricing/legend-catalog-sync.ts";
import type {
  FirecrawlConfig,
  FirecrawlConfigService,
} from "../services/squad-builder/firecrawl-config.ts";
import { GuildLedgerLiveLayer } from "./guild-ledger/live.ts";
import { GuildToolsLiveLayer } from "./guild-tools/live.ts";
import { SquadBuilderLiveLayer } from "./squad-builder/live.ts";

const makeApiStableLayer = <DatabaseError>(
  databaseLayer: Layer.Layer<EffectDatabase, DatabaseError>,
  discordConfigLayer: Layer.Layer<DiscordVerificationConfigService>,
  firecrawlConfigLayer: Layer.Layer<FirecrawlConfigService>
) =>
  Layer.mergeAll(
    GuildToolsLiveLayer,
    GuildLedgerLiveLayer,
    SquadBuilderLiveLayer,
    DrizzleLegendPricingStoreLayer
  ).pipe(
    Layer.provide(databaseLayer),
    Layer.provide(discordConfigLayer),

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

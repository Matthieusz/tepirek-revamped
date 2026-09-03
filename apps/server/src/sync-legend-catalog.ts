import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import {
  LegendCatalogSyncService,
  makeLegendCatalogSyncLayer,
} from "@tepirek-revamped/api/server/effect-app";
import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import { readLegendCatalogSyncConfig } from "./startup-config.js";

const dotEnvProvider = ConfigProvider.fromDotEnv().pipe(
  Effect.catchIf(
    (error) => error.reason._tag === "NotFound",
    () => Effect.succeed(ConfigProvider.fromUnknown({}))
  ),
  Effect.provide(NodeFileSystem.layer)
);

const syncConfigProvider = dotEnvProvider.pipe(
  Effect.map((provider) =>
    ConfigProvider.orElse(ConfigProvider.fromEnv(), provider)
  )
);

const runSynchronization = (
  databaseUrl: string,
  firecrawl: Parameters<typeof makeLegendCatalogSyncLayer>[1]
) =>
  Effect.scoped(
    Effect.gen(function* runLegendCatalogSynchronization() {
      const synchronizer = yield* LegendCatalogSyncService;
      const result = yield* synchronizer.synchronize();
      yield* Effect.logInfo("Legend catalog synchronization succeeded", {
        ...result.reconciliation,
        synchronizedAt: result.synchronizedAt.toISOString(),
      });
    }).pipe(
      Effect.provide(
        makeLegendCatalogSyncLayer(
          makeLiveDatabaseLayer(databaseUrl),
          firecrawl
        )
      )
    )
  );

const main = readLegendCatalogSyncConfig.pipe(
  Effect.provide(ConfigProvider.layer(syncConfigProvider)),
  Effect.flatMap(({ databaseUrl, firecrawl }) =>
    runSynchronization(Redacted.value(databaseUrl), firecrawl)
  )
);

if (import.meta.main) {
  NodeRuntime.runMain(main);
}

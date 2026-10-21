import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";

import { FirecrawlClientServiceLiveLayer } from "../../adapters/squad-builder/firecrawl/firecrawl-client.ts";
import { DrizzleAccountImportStoreServiceLayer } from "../../adapters/squad-builder/persistence/account-import-store.ts";
import { DrizzleAccountRefetchStoreServiceLayer } from "../../adapters/squad-builder/persistence/account-refetch-store.ts";
import { DrizzleAccountSharingStoreServiceLayer } from "../../adapters/squad-builder/persistence/account-sharing-store.ts";
import { DrizzleFirecrawlRequestAccountingStoreServiceLayer } from "../../adapters/squad-builder/persistence/firecrawl-request-accounting-store.ts";
import { DrizzleSquadGroupAggregateStoreServiceLayer } from "../../adapters/squad-builder/persistence/squad-group-aggregate-store.ts";
import { DrizzleSquadGroupDirectoryStoreServiceLayer } from "../../adapters/squad-builder/persistence/squad-group-directory-store.ts";
import { DrizzleSquadGroupSharingStoreServiceLayer } from "../../adapters/squad-builder/persistence/squad-group-sharing-store.ts";

/** Squad-builder graph; the application supplies its shared database and Firecrawl configuration. */
export const SquadBuilderLiveLayer = Layer.mergeAll(
  DrizzleAccountImportStoreServiceLayer,
  DrizzleAccountRefetchStoreServiceLayer,
  DrizzleAccountSharingStoreServiceLayer,
  DrizzleFirecrawlRequestAccountingStoreServiceLayer,
  DrizzleSquadGroupAggregateStoreServiceLayer,
  DrizzleSquadGroupDirectoryStoreServiceLayer,
  DrizzleSquadGroupSharingStoreServiceLayer,
  FirecrawlClientServiceLiveLayer.pipe(Layer.provide(FetchHttpClient.layer))
);

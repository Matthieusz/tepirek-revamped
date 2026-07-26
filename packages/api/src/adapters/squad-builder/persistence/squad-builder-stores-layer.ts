import * as Layer from "effect/Layer";

import { DrizzleAccountImportStoreServiceLayer } from "./account-import-store.ts";
import { DrizzleAccountRefetchStoreServiceLayer } from "./account-refetch-store.ts";
import { DrizzleAccountSharingStoreServiceLayer } from "./account-sharing-store.ts";
import { DrizzleFirecrawlRequestAccountingStoreServiceLayer } from "./firecrawl-request-accounting-store.ts";
import { DrizzleSquadGroupStoreServiceLayer } from "./squad-group-store.ts";

export const DrizzleSquadBuilderStoresLayer = Layer.mergeAll(
  DrizzleAccountImportStoreServiceLayer,
  DrizzleAccountRefetchStoreServiceLayer,
  DrizzleAccountSharingStoreServiceLayer,
  DrizzleFirecrawlRequestAccountingStoreServiceLayer,
  DrizzleSquadGroupStoreServiceLayer
);

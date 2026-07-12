import * as Layer from "effect/Layer";

import { DrizzleAccountImportStoreServiceLayer } from "./account-import-store.ts";
import { DrizzleAccountRefetchStoreServiceLayer } from "./account-refetch-store.ts";
import { DrizzleAccountSharingStoreServiceLayer } from "./account-sharing-store.ts";
import { DrizzleSquadGroupStoreServiceLayer } from "./squad-group-store.ts";

export { DrizzleAccountImportStoreServiceLayer } from "./account-import-store.ts";
export { DrizzleAccountRefetchStoreServiceLayer } from "./account-refetch-store.ts";
export { DrizzleAccountSharingStoreServiceLayer } from "./account-sharing-store.ts";
export { DrizzleSquadGroupStoreServiceLayer } from "./squad-group-store.ts";

export const DrizzleSquadBuilderStoresLayer = Layer.mergeAll(
  DrizzleAccountImportStoreServiceLayer,
  DrizzleAccountRefetchStoreServiceLayer,
  DrizzleAccountSharingStoreServiceLayer,
  DrizzleSquadGroupStoreServiceLayer
);

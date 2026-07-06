import * as Layer from "effect/Layer";

import { DrizzleAccountImportStoreServiceLayer } from "./account-import-store.js";
import { DrizzleAccountRefetchStoreServiceLayer } from "./account-refetch-store.js";
import { DrizzleAccountSharingStoreServiceLayer } from "./account-sharing-store.js";
import { DrizzleSquadGroupStoreServiceLayer } from "./squad-group-store.js";

export { DrizzleAccountImportStoreServiceLayer } from "./account-import-store.js";
export { DrizzleAccountRefetchStoreServiceLayer } from "./account-refetch-store.js";
export { DrizzleAccountSharingStoreServiceLayer } from "./account-sharing-store.js";
export { DrizzleSquadGroupStoreServiceLayer } from "./squad-group-store.js";

export const DrizzleSquadBuilderStoresLayer = Layer.mergeAll(
  DrizzleAccountImportStoreServiceLayer,
  DrizzleAccountRefetchStoreServiceLayer,
  DrizzleAccountSharingStoreServiceLayer,
  DrizzleSquadGroupStoreServiceLayer
);

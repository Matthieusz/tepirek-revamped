import * as Context from "effect/Context";

import type { AccountImportStoreServiceShape } from "../squad-groups/squad-group-store.js";

export class AccountImportStoreService extends Context.Service<
  AccountImportStoreService,
  AccountImportStoreServiceShape
>()("@tepirek-revamped/api/squad-builder/AccountImportStoreService") {}

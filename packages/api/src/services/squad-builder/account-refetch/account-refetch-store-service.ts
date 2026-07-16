import * as Context from "effect/Context";

import type { AccountRefetchStoreServiceShape } from "../squad-groups/squad-group-store.ts";

export class AccountRefetchStoreService extends Context.Service<
  AccountRefetchStoreService,
  AccountRefetchStoreServiceShape
>()("@tepirek-revamped/api/squad-builder/AccountRefetchStoreService") {}

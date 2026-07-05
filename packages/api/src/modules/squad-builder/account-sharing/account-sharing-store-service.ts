import * as Context from "effect/Context";

import type { AccountSharingStoreServiceShape } from "../squad-groups/squad-group-store.js";

export class AccountSharingStoreService extends Context.Service<
  AccountSharingStoreService,
  AccountSharingStoreServiceShape
>()("@tepirek-revamped/api/squad-builder/AccountSharingStoreService") {}

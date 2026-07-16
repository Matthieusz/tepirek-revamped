import * as Context from "effect/Context";

import type { AccountSharingStoreServiceShape } from "../squad-groups/squad-group-store.ts";

export class AccountSharingStoreService extends Context.Service<
  AccountSharingStoreService,
  AccountSharingStoreServiceShape
>()("@tepirek-revamped/api/squad-builder/AccountSharingStoreService") {}

import * as Context from "effect/Context";

import type { EffectAccountSharingStoreShape } from "../squad-groups/squad-group-store";

export class EffectAccountSharingStore extends Context.Service<
  EffectAccountSharingStore,
  EffectAccountSharingStoreShape
>()("@tepirek-revamped/api/squad-builder/EffectAccountSharingStore") {}

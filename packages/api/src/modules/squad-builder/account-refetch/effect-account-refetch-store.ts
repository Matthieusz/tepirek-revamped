import * as Context from "effect/Context";

import type { EffectAccountRefetchStoreShape } from "../squad-groups/squad-group-store";

export class EffectAccountRefetchStore extends Context.Service<
  EffectAccountRefetchStore,
  EffectAccountRefetchStoreShape
>()("@tepirek-revamped/api/squad-builder/EffectAccountRefetchStore") {}

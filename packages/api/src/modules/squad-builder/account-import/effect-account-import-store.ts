import * as Context from "effect/Context";

import type { EffectAccountImportStoreShape } from "../squad-groups/squad-group-store.js";

export class EffectAccountImportStore extends Context.Service<
  EffectAccountImportStore,
  EffectAccountImportStoreShape
>()("@tepirek-revamped/api/squad-builder/EffectAccountImportStore") {}

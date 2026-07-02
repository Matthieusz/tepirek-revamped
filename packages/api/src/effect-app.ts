import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import { ManagedRuntime } from "effect";
import * as Layer from "effect/Layer";

import { DrizzleEffectSquadBuilderStoresLayer } from "./modules/squad-builder/squad-groups/drizzle-squad-group-store.js";

/** Live Layer for Effect-based API modules. */
export const makeApiLiveLayer = (databaseUrl: string) =>
  DrizzleEffectSquadBuilderStoresLayer.pipe(
    Layer.provide(makeLiveDatabaseLayer(databaseUrl))
  );

/** Shared runtime factory for Effect-based API modules. */
export const makeApiManagedRuntime = (databaseUrl: string) =>
  ManagedRuntime.make(makeApiLiveLayer(databaseUrl));

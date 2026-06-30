import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import { ManagedRuntime } from "effect";
import * as Layer from "effect/Layer";

import { DrizzleEffectSquadGroupStoreLayer } from "./modules/squad-builder/squad-groups/drizzle-squad-group-store";

/** Live Layer for Effect-based API modules. */
export const makeApiLiveLayer = (databaseUrl: string) =>
  DrizzleEffectSquadGroupStoreLayer.pipe(
    Layer.provide(makeLiveDatabaseLayer(databaseUrl))
  );

/** Shared runtime factory for Effect-based API modules. */
export const makeApiManagedRuntime = (databaseUrl: string) =>
  ManagedRuntime.make(makeApiLiveLayer(databaseUrl));

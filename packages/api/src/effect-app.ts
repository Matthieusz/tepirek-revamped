import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import { ManagedRuntime } from "effect";
import type { Effect, RunOptions } from "effect/Effect";
import type { Exit } from "effect/Exit";
import * as Layer from "effect/Layer";

import { DrizzleEffectSquadBuilderStoresLayer } from "./modules/squad-builder/squad-groups/drizzle-squad-group-store.js";

/** Process-wide Layer memo map shared by production API Effect runtimes. */
export const apiLayerMemoMap = Layer.makeMemoMapUnsafe();

/** Live Layer for Effect-based API modules. */
export const makeApiLiveLayer = (databaseUrl: string) =>
  DrizzleEffectSquadBuilderStoresLayer.pipe(
    Layer.provide(makeLiveDatabaseLayer(databaseUrl))
  );

export interface ApiRuntime<R, E> {
  readonly dispose: () => Promise<void>;
  readonly getManagedRuntime: () => ManagedRuntime.ManagedRuntime<R, E>;
  readonly runPromise: <A, EffectError>(
    effect: Effect<A, EffectError, R>,
    options?: RunOptions
  ) => Promise<A>;
  readonly runPromiseExit: <A, EffectError>(
    effect: Effect<A, EffectError, R>,
    options?: RunOptions
  ) => Promise<Exit<A, EffectError | E>>;
}

/** Lazy, memoized production runtime factory for Effect-based API modules. */
export const makeRuntime = <R, E>(
  layer: Layer.Layer<R, E>
): ApiRuntime<R, E> => {
  let runtime: ManagedRuntime.ManagedRuntime<R, E> | undefined;

  const getManagedRuntime = () => {
    runtime ??= ManagedRuntime.make(layer, { memoMap: apiLayerMemoMap });
    return runtime;
  };

  return {
    dispose: async () => {
      if (runtime !== undefined) {
        await runtime.dispose();
        runtime = undefined;
      }
    },
    getManagedRuntime,
    runPromise: (effect, options) =>
      getManagedRuntime().runPromise(effect, options),
    runPromiseExit: (effect, options) =>
      getManagedRuntime().runPromiseExit(effect, options),
  };
};

/** Shared runtime factory for Effect-based API modules. */
export const makeApiRuntime = (databaseUrl: string) =>
  makeRuntime(makeApiLiveLayer(databaseUrl));

/** Compatibility factory for oRPC bridge call sites that still need ManagedRuntime. */
export const makeApiManagedRuntime = (databaseUrl: string) =>
  makeApiRuntime(databaseUrl).getManagedRuntime();

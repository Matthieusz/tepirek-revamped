import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import { ManagedRuntime } from "effect";
import type * as Context from "effect/Context";
import type { Effect, RunOptions } from "effect/Effect";
import type { Exit } from "effect/Exit";
import * as Layer from "effect/Layer";

import type { EffectAccountImportStore } from "./modules/squad-builder/account-import/effect-account-import-store.js";
import type { EffectAccountRefetchStore } from "./modules/squad-builder/account-refetch/effect-account-refetch-store.js";
import type { EffectAccountSharingStore } from "./modules/squad-builder/account-sharing/effect-account-sharing-store.js";
import { DrizzleEffectSquadBuilderStoresLayer } from "./modules/squad-builder/squad-groups/drizzle-squad-group-store.js";
import type { EffectSquadGroupStore } from "./modules/squad-builder/squad-groups/squad-group-store.js";

/** Process-wide Layer memo map shared by production API Effect runtimes. */
export const apiLayerMemoMap = Layer.makeMemoMapUnsafe();

/** Live Layer for Effect-based API modules. */
export const makeApiLiveLayer = (databaseUrl: string) =>
  DrizzleEffectSquadBuilderStoresLayer.pipe(
    Layer.provide(makeLiveDatabaseLayer(databaseUrl))
  );

export interface ApiRuntime<I, S, E> {
  readonly dispose: () => Promise<void>;
  readonly getManagedRuntime: () => ManagedRuntime.ManagedRuntime<I, E>;
  readonly runPromise: <A, Err>(
    fn: (svc: S) => Effect<A, Err, I>,
    options?: RunOptions
  ) => Promise<A>;
  readonly runPromiseExit: <A, Err>(
    fn: (svc: S) => Effect<A, Err, I>,
    options?: RunOptions
  ) => Promise<Exit<A, Err | E>>;
}

interface MemoizedRuntime<R, E> {
  readonly dispose: () => Promise<void>;
  readonly getManagedRuntime: () => ManagedRuntime.ManagedRuntime<R, E>;
}

const memoizeRuntime = <R, E>(
  layer: Layer.Layer<R, E>
): MemoizedRuntime<R, E> => {
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
  };
};

/** Lazy, memoized production runtime factory for Effect-based API modules. */
export const makeRuntime = <I, S, E>(
  service: Context.Service<I, S>,
  layer: Layer.Layer<I, E>
): ApiRuntime<I, S, E> => {
  const memoized = memoizeRuntime(layer);

  return {
    dispose: memoized.dispose,
    getManagedRuntime: memoized.getManagedRuntime,
    runPromise: (fn, options) =>
      memoized.getManagedRuntime().runPromise(service.use(fn), options),
    runPromiseExit: (fn, options) =>
      memoized.getManagedRuntime().runPromiseExit(service.use(fn), options),
  };
};

type SquadBuilderServices =
  | EffectSquadGroupStore
  | EffectAccountImportStore
  | EffectAccountRefetchStore
  | EffectAccountSharingStore;

/** Shared runtime factory for Effect-based API modules (raw effect, composite layer). */
export const makeApiRuntime = (databaseUrl: string) => {
  const layer = makeApiLiveLayer(databaseUrl) as unknown as Layer.Layer<
    SquadBuilderServices,
    never
  >;
  const memoized = memoizeRuntime(layer);

  return {
    dispose: memoized.dispose,
    getManagedRuntime: memoized.getManagedRuntime,
    runPromise: <A, Err, R extends SquadBuilderServices>(
      effect: Effect<A, Err, R>,
      options?: RunOptions
    ) => memoized.getManagedRuntime().runPromise(effect, options),
    runPromiseExit: <A, Err, R extends SquadBuilderServices>(
      effect: Effect<A, Err, R>,
      options?: RunOptions
    ) => memoized.getManagedRuntime().runPromiseExit(effect, options),
  };
};

/** Compatibility factory for oRPC bridge call sites that still need ManagedRuntime. */
export const makeApiManagedRuntime = (databaseUrl: string) =>
  makeApiRuntime(databaseUrl).getManagedRuntime();

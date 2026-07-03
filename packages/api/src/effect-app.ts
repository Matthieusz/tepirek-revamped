import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import { ManagedRuntime } from "effect";
import type { ConfigError } from "effect/Config";
import type * as Context from "effect/Context";
import type { Effect, RunOptions } from "effect/Effect";
import type { Exit } from "effect/Exit";
import * as Layer from "effect/Layer";
import type { SqlError } from "effect/unstable/sql/SqlError";

import type { EffectAccountImportStore } from "./modules/squad-builder/account-import/effect-account-import-store.js";
import type { EffectAccountRefetchStore } from "./modules/squad-builder/account-refetch/effect-account-refetch-store.js";
import type { EffectAccountSharingStore } from "./modules/squad-builder/account-sharing/effect-account-sharing-store.js";
import type { Service as AccountSharingState } from "./modules/squad-builder/account-sharing/effect-list-account-sharing-state.js";
import { layer as accountSharingStateLayer } from "./modules/squad-builder/account-sharing/effect-list-account-sharing-state.js";
import type { Service as AccountAccessInviteResponses } from "./modules/squad-builder/account-sharing/effect-respond-to-account-access-invite.js";
import { layer as accountAccessInviteResponsesLayer } from "./modules/squad-builder/account-sharing/effect-respond-to-account-access-invite.js";
import type { Service as AccountAccessRevocations } from "./modules/squad-builder/account-sharing/effect-revoke-account-access.js";
import { layer as accountAccessRevocationsLayer } from "./modules/squad-builder/account-sharing/effect-revoke-account-access.js";
import type { Service as AccountInviteTargets } from "./modules/squad-builder/account-sharing/effect-search-account-invite-targets.js";
import { layer as accountInviteTargetsLayer } from "./modules/squad-builder/account-sharing/effect-search-account-invite-targets.js";
import type { Service as AccountAccessInvites } from "./modules/squad-builder/account-sharing/effect-send-account-access-invite.js";
import { layer as accountAccessInvitesLayer } from "./modules/squad-builder/account-sharing/effect-send-account-access-invite.js";
import { EffectFirecrawlClientLiveLayer } from "./modules/squad-builder/effect-firecrawl-client.js";
import type { EffectFirecrawlClient } from "./modules/squad-builder/effect-firecrawl-client.js";
import { EffectFirecrawlConfigLiveLayer } from "./modules/squad-builder/firecrawl-config.js";
import type { EffectFirecrawlConfig } from "./modules/squad-builder/firecrawl-config.js";
import { DrizzleEffectSquadBuilderStoresLayer } from "./modules/squad-builder/squad-groups/drizzle-squad-group-store.js";
import type { Service as SquadGroupSharingState } from "./modules/squad-builder/squad-groups/effect-list-squad-group-sharing-state.js";
import { layer as squadGroupSharingStateLayer } from "./modules/squad-builder/squad-groups/effect-list-squad-group-sharing-state.js";
import type { Service as SquadGroupEditorInviteResponses } from "./modules/squad-builder/squad-groups/effect-respond-to-squad-group-invite.js";
import { layer as squadGroupEditorInviteResponsesLayer } from "./modules/squad-builder/squad-groups/effect-respond-to-squad-group-invite.js";
import type { Service as SquadGroupEditorRevocations } from "./modules/squad-builder/squad-groups/effect-revoke-squad-group-editor.js";
import { layer as squadGroupEditorRevocationsLayer } from "./modules/squad-builder/squad-groups/effect-revoke-squad-group-editor.js";
import type { Service as SquadEditorInviteTargets } from "./modules/squad-builder/squad-groups/effect-search-squad-editor-invite-targets.js";
import { layer as squadEditorInviteTargetsLayer } from "./modules/squad-builder/squad-groups/effect-search-squad-editor-invite-targets.js";
import type { Service as SquadGroupEditorInvites } from "./modules/squad-builder/squad-groups/effect-send-squad-group-editor-invite.js";
import { layer as squadGroupEditorInvitesLayer } from "./modules/squad-builder/squad-groups/effect-send-squad-group-editor-invite.js";
import type { EffectSquadGroupStore } from "./modules/squad-builder/squad-groups/squad-group-store.js";

/** Process-wide Layer memo map shared by production API Effect runtimes. */
export const apiLayerMemoMap = Layer.makeMemoMapUnsafe();

/** Live Layer for Effect-based API modules. */
export const makeApiSquadBuilderLayer = (
  databaseUrl: string
): Layer.Layer<
  Exclude<SquadBuilderServices, EffectFirecrawlClient | EffectFirecrawlConfig>,
  SqlError
> => {
  const storeLayer = DrizzleEffectSquadBuilderStoresLayer.pipe(
    Layer.provide(makeLiveDatabaseLayer(databaseUrl))
  );

  return Layer.mergeAll(
    storeLayer,
    accountInviteTargetsLayer.pipe(Layer.provide(storeLayer)),
    accountAccessInvitesLayer.pipe(Layer.provide(storeLayer)),
    accountAccessInviteResponsesLayer.pipe(Layer.provide(storeLayer)),
    accountAccessRevocationsLayer.pipe(Layer.provide(storeLayer)),
    accountSharingStateLayer.pipe(Layer.provide(storeLayer)),
    squadEditorInviteTargetsLayer.pipe(Layer.provide(storeLayer)),
    squadGroupEditorInvitesLayer.pipe(Layer.provide(storeLayer)),
    squadGroupEditorInviteResponsesLayer.pipe(Layer.provide(storeLayer)),
    squadGroupEditorRevocationsLayer.pipe(Layer.provide(storeLayer)),
    squadGroupSharingStateLayer.pipe(Layer.provide(storeLayer))
  );
};

export const makeApiLiveLayer = (
  databaseUrl: string
): Layer.Layer<SquadBuilderServices, SqlError | ConfigError> =>
  Layer.mergeAll(
    makeApiSquadBuilderLayer(databaseUrl),
    EffectFirecrawlConfigLiveLayer,
    EffectFirecrawlClientLiveLayer.pipe(
      Layer.provide(EffectFirecrawlConfigLiveLayer)
    )
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
  | EffectAccountSharingStore
  | EffectFirecrawlClient
  | EffectFirecrawlConfig
  | AccountInviteTargets
  | AccountAccessInvites
  | AccountAccessInviteResponses
  | AccountAccessRevocations
  | AccountSharingState
  | SquadEditorInviteTargets
  | SquadGroupEditorInvites
  | SquadGroupEditorInviteResponses
  | SquadGroupEditorRevocations
  | SquadGroupSharingState;

/** Shared runtime factory for Effect-based API modules (raw effect, composite layer). */
export const makeApiRuntime = (databaseUrl: string) => {
  const memoized = memoizeRuntime(makeApiLiveLayer(databaseUrl));

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

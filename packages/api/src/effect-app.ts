import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import { ManagedRuntime } from "effect";
import type { ConfigError } from "effect/Config";
import type * as Context from "effect/Context";
import type { Effect, RunOptions } from "effect/Effect";
import type { Exit } from "effect/Exit";
import * as Layer from "effect/Layer";
import type { SqlError } from "effect/unstable/sql/SqlError";

import { AnnouncementStoreLayer } from "./modules/announcement/announcement-store.js";
import type { AnnouncementStore } from "./modules/announcement/announcement-store.js";
import { AuctionStoreLayer } from "./modules/auction/auction-store.js";
import type { AuctionStore } from "./modules/auction/auction-store.js";
import { EventStoreLayer } from "./modules/event/event-store.js";
import type { EventStore } from "./modules/event/event-store.js";
import { HeroesStoreLayer } from "./modules/heroes/heroes-store.js";
import type { HeroesStore } from "./modules/heroes/heroes-store.js";
import { SkillsStoreLayer } from "./modules/skills/skills-store.js";
import type { SkillsStore } from "./modules/skills/skills-store.js";
import type { AccountImportStoreService } from "./modules/squad-builder/account-import/account-import-store-service.js";
import type { AccountRefetchStoreService } from "./modules/squad-builder/account-refetch/account-refetch-store-service.js";
import type { AccountSharingStoreService } from "./modules/squad-builder/account-sharing/account-sharing-store-service.js";
import type { Service as AccountSharingState } from "./modules/squad-builder/account-sharing/list-account-sharing-state-service.js";
import { layer as accountSharingStateLayer } from "./modules/squad-builder/account-sharing/list-account-sharing-state-service.js";
import type { Service as AccountAccessInviteResponses } from "./modules/squad-builder/account-sharing/respond-to-account-access-invite-service.js";
import { layer as accountAccessInviteResponsesLayer } from "./modules/squad-builder/account-sharing/respond-to-account-access-invite-service.js";
import type { Service as AccountAccessRevocations } from "./modules/squad-builder/account-sharing/revoke-account-access-service.js";
import { layer as accountAccessRevocationsLayer } from "./modules/squad-builder/account-sharing/revoke-account-access-service.js";
import type { Service as AccountInviteTargets } from "./modules/squad-builder/account-sharing/search-account-invite-targets-service.js";
import { layer as accountInviteTargetsLayer } from "./modules/squad-builder/account-sharing/search-account-invite-targets-service.js";
import type { Service as AccountAccessInvites } from "./modules/squad-builder/account-sharing/send-account-access-invite-service.js";
import { layer as accountAccessInvitesLayer } from "./modules/squad-builder/account-sharing/send-account-access-invite-service.js";
import { FirecrawlClientServiceLiveLayer } from "./modules/squad-builder/firecrawl-client-service.js";
import type { FirecrawlClientService } from "./modules/squad-builder/firecrawl-client-service.js";
import { FirecrawlConfigServiceLiveLayer } from "./modules/squad-builder/firecrawl-config.js";
import type { FirecrawlConfigService } from "./modules/squad-builder/firecrawl-config.js";
import { DrizzleSquadBuilderStoresLayer } from "./modules/squad-builder/squad-groups/drizzle-squad-group-store.js";
import type { Service as SquadGroupSharingState } from "./modules/squad-builder/squad-groups/list-squad-group-sharing-state-service.js";
import { layer as squadGroupSharingStateLayer } from "./modules/squad-builder/squad-groups/list-squad-group-sharing-state-service.js";
import type { Service as SquadGroupEditorInviteResponses } from "./modules/squad-builder/squad-groups/respond-to-squad-group-invite-service.js";
import { layer as squadGroupEditorInviteResponsesLayer } from "./modules/squad-builder/squad-groups/respond-to-squad-group-invite-service.js";
import type { Service as SquadGroupEditorRevocations } from "./modules/squad-builder/squad-groups/revoke-squad-group-editor-service.js";
import { layer as squadGroupEditorRevocationsLayer } from "./modules/squad-builder/squad-groups/revoke-squad-group-editor-service.js";
import type { Service as SquadEditorInviteTargets } from "./modules/squad-builder/squad-groups/search-squad-editor-invite-targets-service.js";
import { layer as squadEditorInviteTargetsLayer } from "./modules/squad-builder/squad-groups/search-squad-editor-invite-targets-service.js";
import type { Service as SquadGroupEditorInvites } from "./modules/squad-builder/squad-groups/send-squad-group-editor-invite-service.js";
import { layer as squadGroupEditorInvitesLayer } from "./modules/squad-builder/squad-groups/send-squad-group-editor-invite-service.js";
import type { SquadGroupStoreService } from "./modules/squad-builder/squad-groups/squad-group-store.js";
import { TodoStoreLayer } from "./modules/todo/todo-store.js";
import type { TodoStore } from "./modules/todo/todo-store.js";
import * as Observability from "./observability.js";

/** Process-wide Layer memo map shared by production API Effect runtimes. */
export const apiLayerMemoMap = Layer.makeMemoMapUnsafe();

/** Live Layer for Effect-based API modules. */
export const makeApiSquadBuilderLayer = (
  databaseUrl: string
): Layer.Layer<
  Exclude<
    SquadBuilderServices,
    | FirecrawlClientService
    | FirecrawlConfigService
    | AnnouncementStore
    | TodoStore
    | HeroesStore
    | EventStore
    | SkillsStore
    | AuctionStore
  >,
  SqlError
> => {
  const storeLayer = DrizzleSquadBuilderStoresLayer.pipe(
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
    AnnouncementStoreLayer.pipe(
      Layer.provide(makeLiveDatabaseLayer(databaseUrl))
    ),
    TodoStoreLayer.pipe(Layer.provide(makeLiveDatabaseLayer(databaseUrl))),
    HeroesStoreLayer.pipe(Layer.provide(makeLiveDatabaseLayer(databaseUrl))),
    EventStoreLayer.pipe(Layer.provide(makeLiveDatabaseLayer(databaseUrl))),
    SkillsStoreLayer.pipe(Layer.provide(makeLiveDatabaseLayer(databaseUrl))),
    AuctionStoreLayer.pipe(Layer.provide(makeLiveDatabaseLayer(databaseUrl))),
    FirecrawlConfigServiceLiveLayer,
    FirecrawlClientServiceLiveLayer.pipe(
      Layer.provide(FirecrawlConfigServiceLiveLayer)
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
  const observedLayer = layer.pipe(Layer.provideMerge(Observability.layer));

  const getManagedRuntime = () => {
    runtime ??= ManagedRuntime.make(observedLayer, {
      memoMap: apiLayerMemoMap,
    });
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
  | AnnouncementStore
  | TodoStore
  | HeroesStore
  | EventStore
  | SkillsStore
  | AuctionStore
  | SquadGroupStoreService
  | AccountImportStoreService
  | AccountRefetchStoreService
  | AccountSharingStoreService
  | FirecrawlClientService
  | FirecrawlConfigService
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

import { expect, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import { describe } from "vitest";

import { MargonemForumClientService } from "../../adapters/legend-pricing/margonem-forum/margonem-forum-client.ts";
import type {
  MargonemForumClient,
  MargonemForumTopicPage,
} from "../../adapters/legend-pricing/margonem-forum/margonem-forum-client.ts";
import type {
  LegendCatalogStoreContract,
  LegendCatalogSyncFailure,
} from "./legend-catalog-store.ts";
import { LegendCatalogStoreService } from "./legend-catalog-store.ts";
import {
  LegendCatalogSyncLiveLayer,
  LegendCatalogSyncService,
} from "./legend-catalog-sync.ts";

const emptyTopic = (category: "hero" | "elite2"): MargonemForumTopicPage => ({
  category,
  html: "<html><body><table id=posts></table></body></html>",
  url: `https://forum.margonem.pl/?category=${category}`,
});

const makeStore = (
  failures: LegendCatalogSyncFailure[]
): LegendCatalogStoreContract => ({
  reconcile: () => Effect.die("reconcile should not be called in this test"),
  recordFailure: (input) =>
    Effect.sync(() => {
      failures.push(input);
    }),
});

const provideSync = (
  forum: MargonemForumClient,
  store: LegendCatalogStoreContract
) =>
  LegendCatalogSyncLiveLayer.pipe(
    Layer.provide(Layer.succeed(MargonemForumClientService, forum)),
    Layer.provide(Layer.succeed(LegendCatalogStoreService, store))
  );

describe("legend catalog synchronization", () => {
  it.effect(
    "records a safe failure summary without publishing a catalog",
    () => {
      const failures: LegendCatalogSyncFailure[] = [];
      const forum = MargonemForumClientService.of({
        fetchTopic: (category) => Effect.succeed(emptyTopic(category)),
      });

      return LegendCatalogSyncService.use((sync) => sync.synchronize()).pipe(
        Effect.flip,
        Effect.map((error) => {
          expect(error._tag).toBe("MargonemForumGuideNotParseable");
          expect(failures).toHaveLength(1);
          expect(failures[0]).toMatchObject({
            errorTag: "MargonemForumGuideNotParseable",
            sourcePosts: [],
          });
          return error;
        }),
        Effect.provide(provideSync(forum, makeStore(failures)))
      );
    }
  );

  it.effect("does not run two forum synchronizations concurrently", () =>
    Effect.gen(function* singleFlightTest() {
      const entered = yield* Deferred.make<null>();
      const release = yield* Deferred.make<null>();
      const failures: LegendCatalogSyncFailure[] = [];
      let activeRequests = 0;
      let maximumActiveRequests = 0;
      let requestCount = 0;
      const forum = MargonemForumClientService.of({
        fetchTopic: (category) =>
          Effect.gen(function* controlledFetch() {
            requestCount += 1;
            activeRequests += 1;
            maximumActiveRequests = Math.max(
              maximumActiveRequests,
              activeRequests
            );
            if (requestCount === 2) {
              yield* Deferred.succeed(entered, null);
            }
            yield* Deferred.await(release);
            activeRequests -= 1;
            return emptyTopic(category);
          }),
      });

      return yield* Effect.gen(function* runWithSynchronizationLayer() {
        const sync = yield* LegendCatalogSyncService;
        const first = yield* sync
          .synchronize()
          .pipe(Effect.exit, Effect.forkChild);
        yield* Deferred.await(entered);
        const second = yield* sync
          .synchronize()
          .pipe(Effect.exit, Effect.forkChild);
        yield* Effect.yieldNow;

        expect(maximumActiveRequests).toBe(2);
        yield* Deferred.succeed(release, null);
        expect(Exit.isFailure(yield* Fiber.join(first))).toBe(true);
        expect(Exit.isFailure(yield* Fiber.join(second))).toBe(true);
        expect(failures).toHaveLength(2);
      }).pipe(Effect.provide(provideSync(forum, makeStore(failures))));
    })
  );
});

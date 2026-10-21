import { expect, it } from "@effect/vitest";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";

import { makeApiLiveLayerFromDatabase } from "./effect-app.ts";

it.effect(
  "shares database acquisition failures across feature graphs and releases the resource",
  () =>
    Effect.gen(function* databaseFailureTest() {
      const acquisitions = yield* Ref.make(0);
      const releases = yield* Ref.make(0);

      const databaseLayer = Layer.effect(
        EffectDatabase,
        Effect.gen(function* acquireDatabase() {
          yield* Effect.acquireRelease(
            Ref.update(acquisitions, (count) => count + 1),
            () => Ref.update(releases, (count) => count + 1)
          );

          return yield* Effect.fail("database-unavailable");
        })
      );

      const apiLayer = makeApiLiveLayerFromDatabase(databaseLayer, {
        discordGuildId: "test-guild",
        firecrawl: {
          apiKey: Redacted.make("test-key"),
          monthlyRequestBudget: 100,
          perUserMonthlyRequestBudget: 10,
        },
      });

      const error = yield* Effect.flip(
        Effect.void.pipe(Effect.provide(Layer.merge(databaseLayer, apiLayer)))
      );

      expect(error).toBe("database-unavailable");
      expect(yield* Ref.get(acquisitions)).toBe(1);
      expect(yield* Ref.get(releases)).toBe(1);
    })
);

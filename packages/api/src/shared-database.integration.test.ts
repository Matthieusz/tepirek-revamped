import {
  BetterAuthDatabaseService,
  DATABASE_POOL_MAX_CONNECTIONS,
  EffectDatabase,
  makeSharedDatabaseLayer,
  SharedPostgresPool,
} from "@tepirek-revamped/db/effect";
import { sql } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { expect, it } from "vitest";

import { testDatabaseUrl } from "./test/integration/database.ts";

it("shares one scoped pool between both Drizzle adapters", async () => {
  const pool = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* sharedDatabaseCompatibility() {
        const context = yield* Layer.build(
          makeSharedDatabaseLayer(Redacted.make(testDatabaseUrl))
        );
        const sharedPool = Context.get(context, SharedPostgresPool);
        const effectDatabase = Context.get(context, EffectDatabase);
        const betterAuthDatabase = Context.get(
          context,
          BetterAuthDatabaseService
        );

        yield* effectDatabase.execute(sql`select 1`);
        yield* Effect.promise(
          async () => await betterAuthDatabase.execute(sql`select 1`)
        );

        expect(sharedPool.options.max).toBe(DATABASE_POOL_MAX_CONNECTIONS);
        return sharedPool;
      })
    )
  );

  await expect(pool.query("select 1")).rejects.toThrow();
});

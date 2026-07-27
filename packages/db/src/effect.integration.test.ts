import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { expect, it } from "vitest";

import {
  DATABASE_POOL_MAX_CONNECTIONS,
  makeSharedPostgresPoolLayer,
  SharedPostgresPool,
} from "./effect.ts";

const defaultTestDatabaseUrl =
  "postgresql://postgres:password@localhost:5433/tepirek-revamped-test";
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? defaultTestDatabaseUrl;

it("constructs and closes the scoped shared PostgreSQL pool", async () => {
  const pool = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* sharedPostgresPoolLifecycle() {
        const context = yield* Layer.build(
          makeSharedPostgresPoolLayer(Redacted.make(testDatabaseUrl))
        );
        const sharedPool = Context.get(context, SharedPostgresPool);

        expect(sharedPool.options.max).toBe(DATABASE_POOL_MAX_CONNECTIONS);
        yield* Effect.promise(async () => await sharedPool.query("select 1"));

        return sharedPool;
      })
    )
  );

  await expect(pool.query("select 1")).rejects.toThrow();
});

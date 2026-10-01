import { sql } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { expect, it } from "vitest";

import {
  BetterAuthDatabaseService,
  BetterAuthPostgresPool,
  DATABASE_POOL_MAX_CONNECTIONS,
  EffectDatabase,
  makeBetterAuthPostgresPoolLayer,
  makeDatabaseLayer,
} from "./effect.ts";

const defaultTestDatabaseUrl =
  "postgresql://postgres:password@localhost:5433/tepirek-revamped-test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? defaultTestDatabaseUrl;

it("constructs and closes the scoped Better Auth PostgreSQL pool", async () => {
  const pool = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* betterAuthPostgresPoolLifecycle() {
        const context = yield* Layer.build(
          makeBetterAuthPostgresPoolLayer(Redacted.make(testDatabaseUrl))
        );

        const authPool = Context.get(context, BetterAuthPostgresPool);

        expect(authPool.options.max).toBe(DATABASE_POOL_MAX_CONNECTIONS);
        yield* Effect.promise(async () => await authPool.query("select 1"));

        return authPool;
      })
    )
  );

  await expect(pool.query("select 1")).rejects.toThrow();
});

const ConnectionRow = Schema.Struct({
  pid: Schema.Int,
  timestamp: Schema.Union([Schema.Date, Schema.DateFromString]),
});

it("uses distinct connections and closes both database adapters with their scope", async () => {
  const adapters = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* databaseAdaptersLifecycle() {
        const context = yield* Layer.build(
          makeDatabaseLayer(Redacted.make(testDatabaseUrl))
        );

        const nativeDatabase = Context.get(context, EffectDatabase);
        const authDatabase = Context.get(context, BetterAuthDatabaseService);
        const query = sql`select pg_backend_pid() as pid, '2026-01-01T00:00:00Z'::timestamptz as timestamp`;

        const nativeResult = yield* nativeDatabase.execute(query);

        const authResult = yield* Effect.promise(
          async () => await authDatabase.execute(query)
        );

        const [nativeRow] = yield* Schema.decodeUnknownEffect(
          Schema.Tuple([ConnectionRow])
        )(nativeResult);

        const authRow = yield* Schema.decodeUnknownEffect(ConnectionRow)(
          authResult.rows[0]
        );

        expect(nativeRow.pid).not.toBe(authRow.pid);
        expect(nativeRow.timestamp).toEqual(authRow.timestamp);
        expect(nativeRow.timestamp.toISOString()).toBe(
          "2026-01-01T00:00:00.000Z"
        );

        return { authDatabase, nativeDatabase };
      })
    )
  );

  const nativeExit = await Effect.runPromiseExit(
    adapters.nativeDatabase.execute(sql`select 1`)
  );

  expect(Exit.isFailure(nativeExit)).toBe(true);
  await expect(adapters.authDatabase.execute(sql`select 1`)).rejects.toThrow();
});

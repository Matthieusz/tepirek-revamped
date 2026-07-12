import {
  EffectDatabase,
  makeLiveDatabaseLayer,
} from "@tepirek-revamped/db/effect";
import { todo } from "@tepirek-revamped/db/schema/todo";
import { eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as References from "effect/References";
import { describe, expect, it } from "vitest";

import { userPersistenceQuery } from "./adapters/user/persistence-query.js";
import { createVerifiedMember } from "./test/integration/builders.js";
import { defaultTestDatabaseUrl, testDb } from "./test/integration/database.js";

const databaseLayer = makeLiveDatabaseLayer(defaultTestDatabaseUrl);

describe("Effect database query logging", () => {
  it("does not emit SQL parameters through an installed Effect logger", async () => {
    const secretParameter = "database-logging-secret-7f43f2";
    const capturedEntries: unknown[] = [];
    const capturingLogger = Logger.make((options) => {
      capturedEntries.push({
        annotations: options.fiber.getRef(References.CurrentLogAnnotations),
        message: options.message,
      });
    });

    await Effect.runPromise(
      EffectDatabase.use((database) =>
        database.execute<{ readonly value: string }>(
          sql`select ${secretParameter}::text as value`
        )
      ).pipe(
        Effect.provide(
          Layer.merge(databaseLayer, Logger.layer([capturingLogger]))
        )
      )
    );

    const serializedEntries = JSON.stringify(capturedEntries);
    expect(serializedEntries).not.toContain(secretParameter);
    expect(serializedEntries).not.toContain("params");
  });

  it("rolls back and safely projects a parameterized transaction failure", async () => {
    const actor = await createVerifiedMember({
      id: "transaction-rollback-user",
    });
    const insertedText = "must-be-rolled-back";
    const secretParameter = "transaction-secret-cf395a";
    const capturedEntries: unknown[] = [];
    const capturingLogger = Logger.make((options) => {
      capturedEntries.push({
        annotations: options.fiber.getRef(References.CurrentLogAnnotations),
        message: options.message,
      });
    });
    const observabilityLayer = Logger.layer([capturingLogger]);

    const error = await Effect.runPromise(
      Effect.flip(
        EffectDatabase.use((database) =>
          userPersistenceQuery(
            "transactionRollbackTest",
            database.transaction((tx) =>
              Effect.gen(function* transactionRollbackTest() {
                yield* tx.insert(todo).values({
                  text: insertedText,
                  userId: actor.id,
                });
                yield* tx.execute(sql`select ${secretParameter}::integer`);
              })
            )
          )
        )
      ).pipe(Effect.provide(Layer.merge(databaseLayer, observabilityLayer)))
    );

    expect(error).toMatchObject({
      _tag: "UserAdapterError",
      operation: "transactionRollbackTest",
    });
    const persistedRows = await testDb
      .select({ id: todo.id })
      .from(todo)
      .where(eq(todo.text, insertedText));
    expect(persistedRows).toEqual([]);
    const serializedEntries = JSON.stringify(capturedEntries);
    expect(serializedEntries).not.toContain(secretParameter);
    expect(serializedEntries).not.toContain("params");
  });
});

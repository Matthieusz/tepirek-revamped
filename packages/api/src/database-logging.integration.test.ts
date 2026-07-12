import { once } from "node:events";
import { createServer } from "node:http";

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

import { userPersistenceQuery } from "./adapters/user/persistence-query.ts";
import { makeLoggerLayer } from "./observability.ts";
import { makeStderrLogger } from "./observability/logging.ts";
import * as Otlp from "./observability/otlp.ts";
import { createVerifiedMember } from "./test/integration/builders.ts";
import { defaultTestDatabaseUrl, testDb } from "./test/integration/database.ts";

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

  it("keeps parameters private with stderr and OTLP logging enabled", async () => {
    const secretParameter = "combined-observability-secret-52d19c";
    const sentinel = "combined-observability-enabled";
    const stderrEntries: string[] = [];
    const otlpRequests: string[] = [];
    const collector = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        otlpRequests.push(Buffer.concat(chunks).toString("utf-8"));
        response.writeHead(200).end();
      });
    });

    collector.listen(0, "127.0.0.1");
    await once(collector, "listening");
    const address = collector.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected the local OTLP collector to use a TCP port");
    }

    try {
      const loggerLayer = makeLoggerLayer([
        makeStderrLogger((output) => stderrEntries.push(output)),
        ...Otlp.loggers({
          deploymentEnvironmentName: "test",
          endpoint: `http://127.0.0.1:${address.port}`,
          resourceAttributes: {},
          serviceVersion: "test",
        }),
      ]);

      await Effect.runPromise(
        Effect.scoped(
          EffectDatabase.use((database) =>
            Effect.gen(function* combinedObservabilityTest() {
              yield* database.execute(
                sql`select ${secretParameter}::text as value`
              );
              yield* Effect.log(sentinel);
            })
          ).pipe(Effect.provide(Layer.merge(databaseLayer, loggerLayer)))
        )
      );
    } finally {
      const closed = once(collector, "close");
      collector.close();
      await closed;
    }

    const stderrOutput = stderrEntries.join("\n");
    const otlpOutput = otlpRequests.join("\n");
    expect(stderrOutput).toContain(sentinel);
    expect(otlpOutput).toContain(sentinel);
    expect(stderrOutput).not.toContain(secretParameter);
    expect(stderrOutput).not.toContain("params");
    expect(otlpOutput).not.toContain(secretParameter);
    expect(otlpOutput).not.toContain("params");
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

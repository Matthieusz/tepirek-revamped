import {
  EffectDatabase,
  makeLiveDatabaseLayer,
} from "@tepirek-revamped/db/effect";
import { sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as References from "effect/References";
import { describe, expect, it } from "vitest";

import { defaultTestDatabaseUrl } from "./test/integration/database.js";

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
});

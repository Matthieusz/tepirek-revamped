import { execFileSync } from "node:child_process";

import {
  makeSharedPostgresPoolLayer,
  SharedPostgresPool,
} from "@tepirek-revamped/db/effect";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

const defaultTestDatabaseUrl =
  "postgresql://postgres:password@localhost:5433/tepirek-revamped-test";
const isManagedTestDatabase = process.env.TEST_DATABASE_URL === undefined;
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? defaultTestDatabaseUrl;

const runDockerCompose = (args: readonly string[]) => {
  execFileSync(
    "docker",
    ["compose", "-f", "../../packages/db/docker-compose.test.yml", ...args],
    { stdio: "inherit" }
  );
};

export const setup = async () => {
  if (isManagedTestDatabase) {
    runDockerCompose(["up", "-d", "--wait"]);
  }

  try {
    await Effect.runPromise(
      Effect.gen(function* verifyTestDatabaseConnection() {
        const testPool = yield* SharedPostgresPool;
        yield* Effect.promise(() => testPool.query("select 1"));
      }).pipe(
        Effect.provide(
          makeSharedPostgresPoolLayer(Redacted.make(testDatabaseUrl))
        ),
        Effect.scoped
      )
    );
  } catch (error) {
    if (isManagedTestDatabase) {
      runDockerCompose(["down"]);
    }
    throw new Error("Could not connect to the smoke test database", {
      cause: error,
    });
  }

  return () => {
    if (isManagedTestDatabase) {
      runDockerCompose(["down"]);
    }
  };
};

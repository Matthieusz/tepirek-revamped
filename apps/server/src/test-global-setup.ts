import { execFileSync } from "node:child_process";

import {
  makeSharedPostgresPoolLayer,
  SharedPostgresPool,
} from "@tepirek-revamped/db/effect";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

const defaultTestDatabaseUrl =
  "postgresql://postgres:password@localhost:5433/tepirek-revamped-test";

const runDockerCompose = (args: readonly string[]) => {
  execFileSync(
    "docker",
    ["compose", "-f", "../../packages/db/docker-compose.test.yml", ...args],
    { stdio: "inherit" }
  );
};

export const setup = async () => {
  const configuredTestDatabaseUrl = await Effect.runPromise(
    Config.option(Config.string("TEST_DATABASE_URL"))
  );
  const isManagedTestDatabase = Option.isNone(configuredTestDatabaseUrl);
  const testDatabaseUrl = Option.getOrElse(
    configuredTestDatabaseUrl,
    () => defaultTestDatabaseUrl
  );

  if (isManagedTestDatabase) {
    runDockerCompose(["up", "-d", "--wait"]);
  }

  try {
    await Effect.runPromise(
      Effect.gen(function* verifyTestDatabaseConnection() {
        const testPool = yield* SharedPostgresPool;
        yield* Effect.promise(async () => await testPool.query("select 1"));
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

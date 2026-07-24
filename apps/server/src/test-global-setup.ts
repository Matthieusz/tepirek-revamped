import { execFileSync } from "node:child_process";

import { createDatabase } from "@tepirek-revamped/db";

const defaultTestDatabaseUrl =
  "postgresql://postgres:password@localhost:5433/tepirek-revamped-test";
const isManagedTestDatabase = process.env.TEST_DATABASE_URL === undefined;
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? defaultTestDatabaseUrl;
const { pool: testPool } = createDatabase(testDatabaseUrl);

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
    await testPool.query("select 1");
  } catch {
    throw new Error("Could not connect to the smoke test database");
  }

  return async () => {
    await testPool.end();
    if (isManagedTestDatabase) {
      runDockerCompose(["down"]);
    }
  };
};

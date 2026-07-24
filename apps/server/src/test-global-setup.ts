import { execFileSync } from "node:child_process";

import { createDatabase } from "@tepirek-revamped/db";

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

  const { pool: testPool } = createDatabase(testDatabaseUrl);

  try {
    await testPool.query("select 1");
  } catch (error) {
    try {
      await testPool.end();
    } finally {
      if (isManagedTestDatabase) {
        runDockerCompose(["down"]);
      }
    }
    throw new Error("Could not connect to the smoke test database", {
      cause: error,
    });
  }

  return async () => {
    try {
      await testPool.end();
    } finally {
      if (isManagedTestDatabase) {
        runDockerCompose(["down"]);
      }
    }
  };
};

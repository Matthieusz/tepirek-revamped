import { execFileSync } from "node:child_process";

import {
  defaultTestDatabaseUrl,
  testPool,
  truncateApplicationTables,
} from "./database.js";

const dockerComposeArgs = [
  "compose",
  "-f",
  "../db/docker-compose.test.yml",
] as const;

const shouldManageTestDatabase =
  process.env.TEST_DATABASE_URL === defaultTestDatabaseUrl;

const runDockerCompose = (args: string[]) => {
  execFileSync("docker", [...dockerComposeArgs, ...args], {
    stdio: "inherit",
  });
};

const startManagedTestDatabase = () => {
  if (!shouldManageTestDatabase) {
    return;
  }

  runDockerCompose(["up", "-d", "--wait"]);
};

const stopManagedTestDatabase = () => {
  if (!shouldManageTestDatabase) {
    return;
  }

  runDockerCompose(["down"]);
};

const assertTestDatabaseIsReachable = async () => {
  try {
    await testPool.query("select 1");
  } catch (error) {
    throw new Error(
      "Could not connect to TEST_DATABASE_URL. Ensure it points to a reachable dedicated test database.",
      { cause: error }
    );
  }
};

const applySchema = () => {
  execFileSync("pnpm", ["--filter", "@tepirek-revamped/db", "db:push"], {
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
    stdio: "inherit",
  });
};

export const setup = async () => {
  if (shouldManageTestDatabase) {
    process.env.API_INTEGRATION_MANAGED_DATABASE = "true";
  }

  startManagedTestDatabase();
  await assertTestDatabaseIsReachable();
  applySchema();
  await truncateApplicationTables();

  return async () => {
    await testPool.end();
    stopManagedTestDatabase();
  };
};

import { execFileSync } from "node:child_process";

import {
  isManagedTestDatabase,
  testPool,
  testDatabaseUrl,
  truncateApplicationTables,
} from "./database.ts";

const dockerComposeArgs = [
  "compose",
  "-f",
  "../db/docker-compose.test.yml",
] as const;

const shouldManageTestDatabase = isManagedTestDatabase;

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
  execFileSync("nub", ["run", "--filter", "@tepirek-revamped/db", "db:push"], {
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
    stdio: "inherit",
  });
};

const closeTestDatabase = async () => {
  try {
    await testPool.end();
  } finally {
    stopManagedTestDatabase();
  }
};

export const setup = async () => {
  try {
    startManagedTestDatabase();
    await assertTestDatabaseIsReachable();
    applySchema();
    await truncateApplicationTables();
  } catch (error) {
    await closeTestDatabase();
    throw error;
  }

  return closeTestDatabase;
};

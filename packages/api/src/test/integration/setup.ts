import { beforeEach } from "vitest";

import { truncateApplicationTables } from "./database.ts";

beforeEach(async () => {
  await truncateApplicationTables();
});

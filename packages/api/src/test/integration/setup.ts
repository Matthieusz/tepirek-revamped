import { beforeEach } from "vitest";

import { truncateApplicationTables } from "./database.js";

beforeEach(async () => {
  await truncateApplicationTables();
});

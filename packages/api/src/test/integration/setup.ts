import { beforeEach } from "vitest";

import { truncateApplicationTables } from "./database";

beforeEach(async () => {
  await truncateApplicationTables();
});

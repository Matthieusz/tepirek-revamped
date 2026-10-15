import { beforeEach } from "vite-plus/test";

import { truncateApplicationTables } from "./database.ts";

beforeEach(async () => {
  await truncateApplicationTables();
});

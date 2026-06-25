import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { requireEnv } from "./env";
import { announcement } from "./schema/announcement";
import { auction } from "./schema/auction";
import { auth } from "./schema/auth";
import { bet } from "./schema/bet";
import { event } from "./schema/event";
import { skills } from "./schema/skills";
import { todo } from "./schema/todo";

export const dbPool = new Pool({
  connectionString: requireEnv("DATABASE_URL"),
});

export const db = drizzle(dbPool, {
  schema: {
    ...auth,
    ...todo,
    ...bet,
    ...event,
    ...auction,
    ...announcement,
    ...skills,
  },
});

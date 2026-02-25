import { drizzle } from "drizzle-orm/node-postgres";

import { announcement } from "./schema/announcement";
import { auction } from "./schema/auction";
import { auth } from "./schema/auth";
import { bet } from "./schema/bet";
import { event } from "./schema/event";
import { squadSchema } from "./schema/squad";
import { todo } from "./schema/todo";

export const db = drizzle(process.env.DATABASE_URL || "", {
  schema: {
    ...auth,
    ...todo,
    ...bet,
    ...event,
    ...auction,
    ...announcement,
    ...squadSchema,
  },
});

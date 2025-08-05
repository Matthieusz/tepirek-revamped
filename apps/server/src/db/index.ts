import { drizzle } from "drizzle-orm/node-postgres";
import { auth } from "./schema/auth";
import { todo } from "./schema/todo";

export const db = drizzle(process.env.DATABASE_URL || "", {
	schema: { ...auth, ...todo },
});

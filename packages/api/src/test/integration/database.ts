import { announcement } from "@tepirek-revamped/db/schema/announcement";
import { auction } from "@tepirek-revamped/db/schema/auction";
import {
  account,
  session,
  user,
  verification,
} from "@tepirek-revamped/db/schema/auth";
import {
  hero,
  heroBet,
  heroBetMember,
  userStats,
} from "@tepirek-revamped/db/schema/bet";
import { event } from "@tepirek-revamped/db/schema/event";
import { professions, range, skills } from "@tepirek-revamped/db/schema/skills";
import { todo } from "@tepirek-revamped/db/schema/todo";
import { getTableName, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const applicationTables = [
  account,
  announcement,
  auction,
  event,
  hero,
  heroBet,
  heroBetMember,
  professions,
  range,
  session,
  skills,
  todo,
  user,
  userStats,
  verification,
] as const;

export const defaultTestDatabaseUrl =
  "postgresql://postgres:password@localhost:5433/tepirek-revamped-test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? defaultTestDatabaseUrl;

process.env.TEST_DATABASE_URL = testDatabaseUrl;

if (process.env.DATABASE_URL && process.env.DATABASE_URL === testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL must not match DATABASE_URL. Use a dedicated Postgres test database."
  );
}

process.env.DATABASE_URL = testDatabaseUrl;

export const testPool = new Pool({ connectionString: testDatabaseUrl });

export const testDb = drizzle(testPool);

export const truncateApplicationTables = async () => {
  const tableNames = applicationTables.map((table) =>
    sql.identifier(getTableName(table))
  );

  await testDb.execute(
    sql`truncate table ${sql.join(tableNames, sql`, `)} restart identity cascade`
  );
};

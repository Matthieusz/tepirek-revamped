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
import {
  firecrawlProfileScrapeRequest,
  margonemAccount,
  margonemAccountAccess,
  margonemAccountImportPreview,
  margonemAccountImportPreviewCharacter,
  margonemAccountRefetchPreview,
  margonemAccountRefetchPreviewCharacter,
  margonemCharacter,
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import { todo } from "@tepirek-revamped/db/schema/todo";
import { getTableName, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import {
  assertIntegrationDatabaseResetSafety,
  databaseUrlsMatch,
  parseDatabaseUrl,
} from "./test-database-safety.ts";

const applicationTables = [
  account,
  announcement,
  auction,
  event,
  hero,
  heroBet,
  heroBetMember,
  firecrawlProfileScrapeRequest,
  margonemAccount,
  margonemAccountAccess,
  margonemAccountImportPreview,
  margonemAccountImportPreviewCharacter,
  margonemAccountRefetchPreview,
  margonemAccountRefetchPreviewCharacter,
  margonemCharacter,
  professions,
  range,
  session,
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
  skills,
  todo,
  user,
  userStats,
  verification,
] as const;

export const defaultTestDatabaseUrl =
  "postgresql://postgres:password@localhost:5433/tepirek-revamped-test";

const hasExplicitTestDatabaseUrl = process.env.TEST_DATABASE_URL !== undefined;
export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? defaultTestDatabaseUrl;
const testDatabase = parseDatabaseUrl(testDatabaseUrl, "TEST_DATABASE_URL");
const isVitestWorker = process.env.VITEST_POOL_ID !== undefined;
const developmentDatabase =
  !isVitestWorker && process.env.DATABASE_URL
    ? parseDatabaseUrl(process.env.DATABASE_URL, "DATABASE_URL")
    : undefined;

export const isManagedTestDatabase =
  !hasExplicitTestDatabaseUrl &&
  databaseUrlsMatch(
    testDatabase,
    parseDatabaseUrl(defaultTestDatabaseUrl, "TEST_DATABASE_URL")
  );

if (!isVitestWorker) {
  assertIntegrationDatabaseResetSafety({
    allowDatabaseReset:
      process.env.API_INTEGRATION_ALLOW_DATABASE_RESET === "1",
    developmentDatabase,
    isExplicitTestDatabase: hasExplicitTestDatabaseUrl,
    isManagedDatabase: isManagedTestDatabase,
    testDatabase,
  });
}

process.env.DATABASE_URL = testDatabaseUrl;

export const testPool = new Pool({ connectionString: testDatabaseUrl });

export const testDb = drizzle({ client: testPool });

export const truncateApplicationTables = async () => {
  const tableNames = applicationTables.map((table) =>
    sql.identifier(getTableName(table))
  );

  await testDb.execute(
    sql`truncate table ${sql.join(tableNames, sql`, `)} restart identity cascade`
  );
};

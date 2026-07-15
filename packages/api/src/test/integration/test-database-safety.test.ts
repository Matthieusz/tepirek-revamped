import { describe, expect, it } from "vitest";

import {
  assertIntegrationDatabaseResetSafety,
  databaseUrlsMatch,
  parseDatabaseUrl,
} from "./test-database-safety.ts";

const defaultDatabase = parseDatabaseUrl(
  "postgresql://postgres:password@localhost:5433/tepirek-revamped-test",
  "TEST_DATABASE_URL"
);

const externalDatabase = parseDatabaseUrl(
  "postgresql://postgres:password@test-db.example/tepirek-revamped-test",
  "TEST_DATABASE_URL"
);

const assertSafe = (input: {
  readonly developmentDatabase: ReturnType<typeof parseDatabaseUrl> | undefined;
  readonly isManagedDatabase: boolean;
  readonly isExplicitTestDatabase: boolean;
  readonly testDatabase: ReturnType<typeof parseDatabaseUrl>;
  readonly allowDatabaseReset: boolean;
}) => assertIntegrationDatabaseResetSafety(input);

describe("integration database reset safety", () => {
  it("allows the built-in managed Docker database without acknowledgement", () => {
    expect(() =>
      assertSafe({
        allowDatabaseReset: false,
        developmentDatabase: undefined,
        isExplicitTestDatabase: false,
        isManagedDatabase: true,
        testDatabase: defaultDatabase,
      })
    ).not.toThrow();
  });

  it("requires exact reset acknowledgement for an explicit external database", () => {
    expect(() =>
      assertSafe({
        allowDatabaseReset: false,
        developmentDatabase: undefined,
        isExplicitTestDatabase: true,
        isManagedDatabase: false,
        testDatabase: externalDatabase,
      })
    ).toThrow("API_INTEGRATION_ALLOW_DATABASE_RESET=1");

    expect(() =>
      assertSafe({
        allowDatabaseReset: true,
        developmentDatabase: undefined,
        isExplicitTestDatabase: true,
        isManagedDatabase: false,
        testDatabase: externalDatabase,
      })
    ).not.toThrow();
  });

  it("rejects a test database that matches the development database", () => {
    const developmentDatabase = parseDatabaseUrl(
      "postgres://developer:different-password@LOCALHOST/tepirek-revamped-test?sslmode=disable",
      "DATABASE_URL"
    );
    const equivalentTestDatabase = parseDatabaseUrl(
      "postgresql://postgres:password@localhost:5432/tepirek-revamped-test?sslmode=disable",
      "TEST_DATABASE_URL"
    );

    expect(databaseUrlsMatch(developmentDatabase, equivalentTestDatabase)).toBe(
      true
    );
    expect(() =>
      assertSafe({
        allowDatabaseReset: true,
        developmentDatabase,
        isExplicitTestDatabase: true,
        isManagedDatabase: false,
        testDatabase: equivalentTestDatabase,
      })
    ).toThrow("TEST_DATABASE_URL must not match DATABASE_URL");
  });

  it("allows an external database when DATABASE_URL is absent and consent is exact", () => {
    expect(() =>
      assertSafe({
        allowDatabaseReset: true,
        developmentDatabase: undefined,
        isExplicitTestDatabase: true,
        isManagedDatabase: false,
        testDatabase: externalDatabase,
      })
    ).not.toThrow();
  });

  it("rejects malformed database URLs before a pool can be created", () => {
    expect(() =>
      parseDatabaseUrl("not a database URL", "TEST_DATABASE_URL")
    ).toThrow("TEST_DATABASE_URL");
    expect(() =>
      parseDatabaseUrl("https://example.com/database", "DATABASE_URL")
    ).toThrow("DATABASE_URL");
    expect(() =>
      parseDatabaseUrl("postgresql://", "TEST_DATABASE_URL")
    ).toThrow("TEST_DATABASE_URL");

    expect(() =>
      parseDatabaseUrl(
        "postgresql://postgres:password@external.test/database",
        "TEST_DATABASE_URL"
      )
    ).not.toThrow();
  });
});

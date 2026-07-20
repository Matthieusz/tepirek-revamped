import * as HashSet from "effect/HashSet";

type DatabaseUrlMetadata = Readonly<{
  canonical: string;
}>;

const defaultPostgresPort = "5432";
const postgresProtocols = HashSet.fromIterable(["postgres:", "postgresql:"]);

const canonicalizeSearch = (url: URL) => {
  const parameters = [...url.searchParams.entries()].toSorted(
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
  );

  return new URLSearchParams(parameters).toString();
};

export const parseDatabaseUrl = (
  value: string,
  environmentKey: "DATABASE_URL" | "TEST_DATABASE_URL"
): DatabaseUrlMetadata => {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${environmentKey} must be a valid PostgreSQL URL.`);
  }

  if (
    !HashSet.has(postgresProtocols, url.protocol) ||
    url.hostname.length === 0
  ) {
    throw new Error(`${environmentKey} must be a valid PostgreSQL URL.`);
  }

  const protocol = "postgresql:";
  const port = url.port || defaultPostgresPort;
  const search = canonicalizeSearch(url);

  return {
    canonical: [
      protocol,
      url.hostname.toLowerCase(),
      port,
      url.pathname,
      search,
    ].join("|"),
  };
};

export const databaseUrlsMatch = (
  left: DatabaseUrlMetadata,
  right: DatabaseUrlMetadata
) => left.canonical === right.canonical;

export const assertIntegrationDatabaseResetSafety = ({
  developmentDatabase,
  isManagedDatabase,
  isExplicitTestDatabase,
  testDatabase,
  allowDatabaseReset,
}: {
  readonly developmentDatabase: DatabaseUrlMetadata | undefined;
  readonly isManagedDatabase: boolean;
  readonly isExplicitTestDatabase: boolean;
  readonly testDatabase: DatabaseUrlMetadata;
  readonly allowDatabaseReset: boolean;
}) => {
  if (
    developmentDatabase &&
    databaseUrlsMatch(developmentDatabase, testDatabase)
  ) {
    throw new Error(
      "TEST_DATABASE_URL must not match DATABASE_URL. Use a dedicated Postgres test database."
    );
  }

  if (isManagedDatabase) {
    return;
  }

  if (!isExplicitTestDatabase || !allowDatabaseReset) {
    throw new Error(
      "An explicit dedicated TEST_DATABASE_URL requires API_INTEGRATION_ALLOW_DATABASE_RESET=1 because integration tests migrate and truncate it."
    );
  }
};

# API router integration tests with real Postgres

We will use API/router integration tests as the main confidence layer for guild-critical workflows because permissions, validation, and database state are where trust-breaking regressions are most likely. These tests will run against a dedicated real PostgreSQL test database, reset state by truncating application tables between tests, create real test users while faking only the authenticated session at the API context boundary, and use small explicit test data builders rather than large shared fixtures.

## Considered Options

- Frontend/component tests as the main confidence layer: rejected because they do not exercise the workflow rules, permissions, and database behavior deeply enough.
- Full end-to-end tests as the main confidence layer: rejected because they are slower and more brittle, but they remain useful for a small number of smoke journeys.
- Mocked, SQLite, or in-memory persistence for integration tests: rejected because Drizzle/Postgres constraints, transactions, defaults, relations, and SQL semantics are part of the behavior we need confidence in.
- Global coverage thresholds in the first rollout: rejected because the app currently has very little test coverage and thresholds would encourage shallow tests before the suite architecture is established.

## Consequences

The first implementation slice should prove the architecture with auction signup and slot uniqueness behavior through the API/router boundary. CI and local workflows must provide a dedicated test PostgreSQL database and a reliable migration/setup plus truncation path.

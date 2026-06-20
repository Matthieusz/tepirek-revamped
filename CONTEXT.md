# Context

## Glossary

### Guild-critical workflow

A user-facing workflow where a regression would seriously damage trust in the app because it affects guild coordination, access, auctions, events, betting, or other shared state that members rely on.

### Critical workflow confidence

The primary goal of the test suite: prove that guild-critical workflows keep working across changes. This is prioritized over maximizing coverage percentage in the first version of the suite.

### Integration test database

A dedicated PostgreSQL database used only for integration tests. It is separate from the development database, uses the real application schema, and is reset between tests by truncating application tables.

### Test data builder

A small helper that creates one explicit domain object for a test, such as an admin user, verified user, auction, event, or bet. Builders may provide safe defaults, but tests should name the facts that matter for the behavior under test. Large shared fixtures are avoided.

### Auction slot

A single signup position in an auction grid, identified by auction type, profession, level, round, and column. At most one member can occupy an Auction slot.

### Hero bet

A record that a set of verified members participated in a bet for one Hero during an Event. The Hero bet splits the configured points for that Hero across its members.

### Vault payout

A distribution of gold for one Hero based on accumulated Hero bet points. Vault payout results contribute to each member's earnings and paid-out status in the Skarbiec workflow.

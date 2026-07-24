# Context

## App at a glance

Tepirek Revamped is dark-mode-only guild operations software for [Margonem](https://www.margonem.com/) players, primarily the Polish-speaking "Gildia Złodziei" community. It replaces spreadsheets and chat threads for coordinating the shared guild state members rely on:

- Events, hero records, hero betting, rankings, and the guild vault ("Skarbiec") payouts.
- Main- and auxiliary-character auctions with profession views.
- Skill tracking by range.
- Announcements and personal tasks.
- Squad planning from imported Margonem accounts, with shared squad groups.
- ODW, "ulepa", and bounty calculators.
- Email/password and Discord sign-in, with Discord guild-membership verification gating the `verified` flag an admin approves.

The monorepo has four workspaces: `apps/web` (TanStack Start + React frontend on port 3001), `apps/server` (Hono host on Bun, port 3000), `packages/api` (Effect HttpApi contracts, domain logic, services, and handlers, plus Drizzle adapters), `packages/db` (Drizzle schemas and migrations), and `packages/auth` (Better Auth). `packages/config` holds shared types and configuration. The web app consumes the same Effect `AppHttpApi` contract the server implements; the server's OpenAPI document is at `/api/openapi.json`. See `README.md` for local setup and `DESIGN.md` / `PRODUCT.md` for the product and design direction.

## Architecture vocabulary

### Executable boundary

The outermost layer where environment values are parsed and dependencies are wired before any traffic flows. In the server (`apps/server/src/index.ts`) the Hono app is the executable boundary: it reads startup config, constructs the database, auth, and Effect `AppHttpApiLayer`, and narrows the exported web handler. Observability transport values are also parsed here because they configure external OTLP, but the observability layers themselves remain adapter concerns.

### HttpApi contract / handlers / adapters (Effect layering)

The API follows a three-tier Effect structure in `packages/api`:

- **Protocol contract** (`src/protocol/**`) — the Effect `HttpApi` / `HttpApiGroup` declarations plus request/response `Schema`s. Shared verbatim by the server (handlers) and the web app (typed client).
- **Server handlers** (`src/server/**`) — wire each contract endpoint to application services and the session middleware.
- **Services** (`src/services/**`) — the application use-cases (`Effect.fn`-based, `Service.of`-wrapped contracts). Pure domain orchestration; no HTTP or Drizzle imports.
- **Adapters** (`src/adapters/**`) — the "live" implementations of service contracts: Drizzle-backed stores, Firecrawl, Discord verification, etc. Composed into `makeApiLiveLayerFromValues` / `makeApiLiveLayerFromConfig` in `src/server/effect-app.ts`.

The session middleware (`SessionMiddleware`) is attached at the contract level only to squad-builder groups, which are the user-owned, auth-protected surface. Legacy guild-critical groups (events, bets, vault, auction, skills, heroes, ranking, announcements, todos, user) currently sit outside the session middleware at the contract layer.

### Branded identifier

A nominal-typed ID that prevents mixing up unrelated numeric/string keys. `packages/api/src/domain/core-identifiers.ts` defines `EventId`, `HeroId`, etc.; `domain/squad-builder/*` defines `MargonemAccountId`, `MargonemProfileId`, `SquadGroupId`, `SquadId`, `AppUserId`, and the pending-preview IDs. Decoding persisted DB values through Effect `Schema` (see commit "decode persisted DB values through Effect Schema") keeps the branded boundaries intact across the adapter seam.

### Shared schema interfaces

Protocol and domain `Schema.Struct` declarations carry an explicit TypeScript interface (the `*.Type` of the schema) so contracts, adapters, and clients reference a named shape rather than re-deriving it. New protocol contracts follow this convention (`refactor: add schema type interfaces to ... protocol contracts`).

### Observability boundary

The logging/tracing composition in `packages/api/src/observability.ts`: a `Logger.layer` plus OTLP tracing, fed a parsed `ObservabilityConfig`. The `evlog` library wires request logging and Better Auth middleware at the Hono boundary; secrets such as the persisted Discord access token are redacted before they reach logs.

## Glossary

### Guild-critical workflow

A user-facing workflow where a regression would seriously damage trust in the app because it affects guild coordination, access, auctions, events, betting, vault payouts, or other shared state that members rely on.

### Critical workflow confidence

The primary goal of the test suite: prove that guild-critical workflows keep working across changes. Integration coverage now spans events, hero bets, vault distribution, auctions, announcements, and the squad-builder route surface; the principle remains that confidence in these workflows is prioritized over maximizing raw coverage percentage.

### Integration test database

A dedicated PostgreSQL database used only for integration tests. It is separate from the development database, uses the real application schema, and is reset between tests by truncating application tables. The managed default lives on port `5433` (`postgresql://postgres:password@localhost:5433/tepirek-revamped-test`); `test-database-safety.ts` asserts a reset guard so the suite never truncates development or production data. To point the suite at an existing test database set `TEST_DATABASE_URL` and `API_INTEGRATION_ALLOW_DATABASE_RESET=1`.

### Test data builder

A small helper that creates one explicit domain object for a test, such as an admin user, verified user, auction, event, hero, profession, or range (`packages/api/src/test/integration/builders.ts`). Builders provide safe defaults, but tests should name the facts that matter for the behavior under test. Large shared fixtures are avoided.

### Auction slot

A single signup position in an auction grid, identified by auction `type`, `profession`, `level`, `round`, and `column`, enforced by the `auction_slot_unique_idx` on `auction_signups`. At most one member can occupy an Auction slot.

### Hero bet

A record that a set of verified members participated in a bet for one `hero` during an `event` (`hero_bet` plus `hero_bet_member` rows). The Hero bet splits the configured `point_worth` for that Hero across its members.

### Vault payout

A distribution of gold for one Hero based on accumulated Hero bet points. The Vault service `distributeGold(heroId, goldAmount)` updates per-member `user_stats` (earnings and `paid_out`); `togglePaidOut` and read endpoints feed the Skarbiec workflow.

### Squad group

A named, owner-scoped container of one or more ordered squads (`squad_groups` → `squads` → `squad_characters`). A squad group is the unit members share with each other: visibility is `private` or public, and editors can be invited via `squad_group_invitations`. Squad characters reference shared `margonem_account` / `margonem_character` rows so a single imported account can appear across squads without data duplication.

### Margonem account import

The flow that turns a public Margonem profile URL into an owned `margonem_account`. A `margonem_account_import_preview` (plus preview-character rows) is created by scraping the profile through Firecrawl, then confirmed by the importing user to persist the real account. Previews expire and record Firecrawl credit usage; the profile HTML is parsed by `domain/squad-builder/margonem-profile-html-parser.ts`.

### Margonem account refetch

The flow that re-scrapes an existing `margonem_account` to detect character changes. A `margonem_account_refetch_preview` stores a JSON diff of added/changed/removed characters and is applied by the owner to update the persisted account. Like imports, refetch previews expire and track Firecrawl credit usage.

### Firecrawl scrape request

A durable record of a Firecrawl profile scrape attempt (`firecrawl_profile_scrape_requests`): status, cache state, credits used, Firecrawl status code, error tag, and the year/month bucket used for quota reasoning. The Firecrawl client is the only path that consumes Firecrawl credits.

### Account access (account sharing)

A grant letting another user use an owner's `margonem_account` for squad planning. Access rows in `margonem_account_access` carry an invitation `status`; the flow is invite → accept/decline → revoke, filtered to never leave orphaned access. This is distinct from squad-group editor invitations.

### Discord guild verification

The use-case (`VerifyDiscordGuildMembership`) that checks the signed-in user's linked Discord account against the configured guild and, on success, persists `user.verified = true`. It powers the admin-approval gate and the waiting room; retry uses a jittered schedule and the persisted access token is redacted in logs.

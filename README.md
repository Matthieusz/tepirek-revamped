# Tepirek Revamped

Guild operations software for [Margonem](https://www.margonem.com/) players. It replaces the spreadsheets and chat threads used to coordinate events, hero bets, auctions, skill ranges, player access, and squads.

## What is here

- Events, hero records, betting, rankings, and the guild vault
- Main- and auxiliary-character auctions with profession views
- Skill tracking by range
- Player verification, announcements, and tasks
- Squad planning from imported Margonem accounts
- ODW and item-upgrade calculators
- Email/password and Discord sign-in with admin approval

## Repository layout

```text
apps/web       TanStack Start and React frontend (port 3001)
apps/server    Bun/Hono HTTP server (port 3000)
packages/api   Effect HTTP contracts, domain logic, and handlers
packages/auth  Better Auth configuration
packages/db    Drizzle schemas, migrations, and local PostgreSQL
packages/config Shared TypeScript and application configuration
```

The web and server applications use the same Effect HTTP contracts from `packages/api`. PostgreSQL access is defined in `packages/db`; authentication is kept in `packages/auth`.

## Local setup

You need Node.js 20 or newer, pnpm 11, Bun, and Docker.

```bash
git clone https://github.com/Matthieusz/tepirek-revamped.git
cd tepirek-revamped
corepack enable
pnpm install
cp apps/server/.env.example apps/server/.env
```

Fill in `apps/server/.env`. The local database started by this repository uses:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/tepirek-revamped
BETTER_AUTH_SECRET=replace-with-at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
```

Discord credentials, a Discord server ID, and a Firecrawl API key are also required at startup; every variable is documented in [`apps/server/.env.example`](apps/server/.env.example). Keep `.env` out of source control and rotate any secret that is exposed.

Start PostgreSQL, apply the schema, and run both applications:

```bash
pnpm db:start
pnpm db:push
pnpm dev
```

Open <http://localhost:3001>. The API is available at <http://localhost:3000>; its OpenAPI document is at <http://localhost:3000/api/openapi.json>.

## Commands

| Command                 | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| `pnpm dev`              | Run web and server development processes     |
| `pnpm build`            | Build all workspaces                         |
| `pnpm check-types`      | Type-check all workspaces                    |
| `pnpm test`             | Run unit tests                               |
| `pnpm test:smoke`       | Check server startup and health              |
| `pnpm test:integration` | Run API tests against dedicated PostgreSQL   |
| `pnpm check`            | Check formatting and lint rules              |
| `pnpm fix`              | Apply formatting and safe lint fixes         |
| `pnpm check:unused`     | Find unused files, exports, and dependencies |
| `pnpm db:generate`      | Generate a migration after a schema change   |
| `pnpm db:migrate`       | Apply committed migrations                   |
| `pnpm db:studio`        | Open Drizzle Studio                          |
| `pnpm db:stop`          | Stop local PostgreSQL                        |

Integration tests create a dedicated PostgreSQL container on port `5433`. To use an existing test database, set `TEST_DATABASE_URL` and `API_INTEGRATION_ALLOW_DATABASE_RESET=1`. The suite migrates and truncates that database, so never point it at development or production data.

## Technical references

- [Margonem](https://www.margonem.com/) — the game this project supports
- [TanStack Start](https://tanstack.com/start/latest) and [React](https://react.dev/) — web application
- [Effect](https://effect.website/) — schemas, services, and HTTP contracts
- [Hono](https://hono.dev/) and [Bun](https://bun.sh/docs) — server host and runtime
- [Better Auth](https://www.better-auth.com/docs) — sessions and Discord OAuth
- [Drizzle ORM](https://orm.drizzle.team/docs/overview) and [PostgreSQL](https://www.postgresql.org/docs/) — persistence
- [Turborepo](https://turborepo.com/docs) and [pnpm workspaces](https://pnpm.io/workspaces) — monorepo tooling

## Contributing

Keep changes scoped and follow the existing workspace boundaries. Before opening a pull request, run:

```bash
pnpm check
pnpm check-types
pnpm test
```

Schema changes should include generated migrations. API behavior should include unit or integration coverage as appropriate.

Licensed under the [MIT License](LICENSE).

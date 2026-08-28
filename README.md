<div align="center">
  <img src="apps/web/public/logo.svg" alt="Tepirek Revamped crest" width="96" />
  <h1>Tepirek Revamped</h1>
  <p><strong>Guild operations, without the spreadsheets.</strong></p>
  <p>
    <a href="https://github.com/Matthieusz/tepirek-revamped/actions/workflows/ci.yml"><img alt="CI status" src="https://shieldcn.dev/github/ci/Matthieusz/tepirek-revamped.svg?variant=secondary" /></a>
    <a href="https://github.com/Matthieusz/tepirek-revamped"><img alt="GitHub stars" src="https://shieldcn.dev/github/stars/Matthieusz/tepirek-revamped.svg?variant=secondary" /></a>
    <a href="https://github.com/Matthieusz/tepirek-revamped/blob/main/LICENSE"><img alt="License" src="https://shieldcn.dev/github/license/Matthieusz/tepirek-revamped.svg?variant=outline" /></a>
    <a href="https://github.com/Matthieusz/tepirek-revamped/commits/main"><img alt="Last commit" src="https://shieldcn.dev/github/commits/Matthieusz/tepirek-revamped.svg?variant=outline" /></a>
  </p>
  <p>
    <a href="#what-it-does">What it does</a> ·
    <a href="#get-started">Get started</a> ·
    <a href="#architecture">Architecture</a> ·
    <a href="#commands">Commands</a>
  </p>
</div>

Tepirek Revamped is guild operations software for [Margonem](https://www.margonem.com/) players. It brings the shared guild state out of spreadsheets and chat threads and into one place.

## What it does

| Workflow | What you can do |
| --- | --- |
| **Guild operations** | Coordinate events, hero records, bets, rankings, and guild vault payouts (`Skarbiec`). |
| **Auctions** | Run main- and auxiliary-character auctions with profession-aware views. |
| **Skills** | Track skill ranges across the guild. |
| **People & access** | Verify players, publish announcements, assign tasks, and manage sign-in with email/password or Discord. |
| **Squads** | Import Margonem accounts and plan squads with shared squad groups. |
| **Calculators** | Calculate ODW, item upgrades (`ulepa`), and bounties. |

## At a glance

<div align="center">
  <img alt="Node.js 24 or newer" src="https://shieldcn.dev/badge/node.js-24%2B-79ad98.svg?variant=secondary" />
  <img alt="pnpm 11" src="https://shieldcn.dev/badge/pnpm-11-79ad98.svg?variant=secondary" />
  <img alt="Bun runtime" src="https://shieldcn.dev/badge/bun-1.3-79ad98.svg?variant=secondary" />
  <img alt="PostgreSQL 16" src="https://shieldcn.dev/badge/postgresql-16-79ad98.svg?variant=secondary" />
</div>

<div align="center">
  <img alt="GitHub issues over time" src="https://shieldcn.dev/chart/github/issues/Matthieusz/tepirek-revamped.svg?theme=green&mode=dark&height=280" width="720" />
</div>

## Get started

### Prerequisites

You need:

- Node.js 24 or newer
- pnpm 11
- Bun
- Docker

### Install

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

Discord credentials, a Discord server ID, and a Firecrawl API key are also required at startup. Every variable is documented in [`apps/server/.env.example`](apps/server/.env.example). Keep `.env` out of source control and rotate any secret that is exposed.

Start PostgreSQL, apply the schema, and run both applications:

```bash
pnpm db:start
pnpm db:push
pnpm dev
```

Then open [http://localhost:3001](http://localhost:3001). The API runs at [http://localhost:3000](http://localhost:3000), with its OpenAPI document at [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json).

## Architecture

The repository is a pnpm monorepo. The web and server applications share the same Effect HTTP contracts from `packages/api`.

```text
apps/web       TanStack Start + React frontend (port 3001)
apps/server    Bun/Hono HTTP server (port 3000)
packages/api   Effect HTTP contracts, domain logic, and handlers
packages/auth  Better Auth configuration
packages/db    Drizzle schemas, migrations, and local PostgreSQL
packages/config Shared TypeScript and application configuration
```

The API is organized around three boundaries:

1. **Protocol contracts** — `HttpApi` declarations and `Schema`s shared by the server and typed web client.
2. **Services** — application use cases that orchestrate domain behavior without HTTP or Drizzle imports.
3. **Adapters** — live implementations for PostgreSQL, Firecrawl, Discord verification, and other dependencies.

PostgreSQL access is defined in `packages/db`; authentication is kept in `packages/auth`.

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

### Web bundle tooling

Inspect a production bundle with:

```bash
ANALYZE=true pnpm --filter web build
```

This writes `apps/web/bundle-analysis.html`. For self-hosted deployments, generate pre-compressed assets with `PRECOMPRESS=true`; Cloudflare and Vercel handle edge compression automatically:

```bash
PRECOMPRESS=true pnpm --filter web build
```

## Testing safely

Integration tests create a dedicated PostgreSQL container on port `5433`:

```text
postgresql://postgres:password@localhost:5433/tepirek-revamped-test
```

To use an existing test database, set `TEST_DATABASE_URL` and `API_INTEGRATION_ALLOW_DATABASE_RESET=1`. The suite migrates and truncates that database, so **never point it at development or production data**.

## Effect TypeScript tooling

<details>
<summary>Editor and compiler setup</summary>

This repository uses `@effect/tsgo` as both its patched TypeScript compiler and its TypeScript language server. `pnpm install` runs `effect-tsgo patch` through the `prepare` script. Confirm the patched compiler with:

```bash
pnpm tsc --version
```

The version must include an `effect-tsgo` suffix. In VS Code, use the workspace TypeScript version when prompted. Do not run another TypeScript language server alongside the native TypeScript-Go server, because that duplicates diagnostics and degrades editor performance.

Other editors must launch the patched workspace `tsgo` binary as their sole TypeScript language server. Run `pnpm effect-tsgo get-exe-path` to locate it for the current platform, and consult the [`@effect/tsgo` editor guidance](https://github.com/Effect-TS/tsgo#best-practices) when configuring the client.

Effect diagnostics use their defaults throughout the repository. The API and server TypeScript projects additionally warn about direct global fetch, environment, timer, and randomness access, plus unsafe Effect type assertions. These checks are intentionally not enabled for the React web project.

</details>

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

## License

Licensed under the [MIT License](LICENSE).

<div align="center">
  <sub>README badges and charts powered by <a href="https://shieldcn.dev/">shieldcn</a>.</sub>
</div>

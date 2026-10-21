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
  <img alt="Node.js 26 or newer" src="https://shieldcn.dev/badge/node.js-26%2B-79ad98.svg?variant=secondary" />
  <img alt="pnpm 12" src="https://shieldcn.dev/badge/pnpm-12-79ad98.svg?variant=secondary" />
  <img alt="PostgreSQL 16" src="https://shieldcn.dev/badge/postgresql-16-79ad98.svg?variant=secondary" />
</div>

<div align="center">
  <img alt="GitHub issues over time" src="https://shieldcn.dev/chart/github/issues/Matthieusz/tepirek-revamped.svg?theme=green&mode=dark&height=280" width="720" />
</div>

## Get started

### Prerequisites

You need:

- [mise](https://mise.jdx.dev/getting-started.html) on your shell and Git runtime `PATH`
- Docker

[`mise.toml`](mise.toml) pins Node.js 26.10.0 and pnpm 12.9.1. CI uses the same versions; keep the pnpm pin aligned with `packageManager` in `package.json`.

### Install

```bash
git clone https://github.com/Matthieusz/tepirek-revamped.git
cd tepirek-revamped
mise trust
mise install
mise exec -- pnpm install
cp apps/server/.env.example apps/server/.env
```

Activate mise in your shell as described in its getting-started guide, or prefix project commands with `mise exec --`.

### Git hooks

`pnpm install` installs Vite+'s repository-local hook dispatcher. The pre-commit hook runs `vp staged` using the pinned mise toolchain, fixes staged files, and stashes/restores unstaged changes to protect partial commits; it also runs `pnpm check:unused`. No global hooks are installed.

```bash
pnpm exec vp hooks status   # Inspect the active dispatcher
pnpm exec vp hooks disable  # Disable hooks in this checkout
pnpm exec vp hooks enable   # Re-enable hooks
pnpm exec vp staged         # Check and fix staged files
```

Set `VP_GIT_HOOKS=0` to skip hooks and hook installation in CI or production. The generated `.vite-hooks/_` dispatcher is ignored; `.vite-hooks/pre-commit` and the root `vite.config.ts` staged configuration are versioned.

### Application configuration

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
apps/server    Node.js/Hono HTTP server (port 3000)
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

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run web and server development processes |
| `pnpm build` | Build all workspaces |
| `pnpm check-types` | Type-check all workspaces |
| `pnpm test` | Run unit tests |
| `pnpm test:smoke` | Check server startup and health |
| `pnpm test:integration` | Run API tests against dedicated PostgreSQL |
| `pnpm check` | Check formatting, standard lint, and Effect diagnostics |
| `pnpm check:effect` | Run the separate Effect diagnostics pass |
| `pnpm fix` | Apply formatting and safe lint fixes |
| `pnpm check:unused` | Find unused files, exports, and dependencies |
| `pnpm db:generate` | Generate a migration after a schema change |
| `pnpm db:migrate` | Apply committed migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:stop` | Stop local PostgreSQL |

## CI and deployment toolchains

CI runs checks/build, unit tests, and smoke/API integration tests in independent jobs. In the smoke/integration job, PostgreSQL starts in the background during checkout and dependency installation. After a bounded readiness check, smoke and integration tests run concurrently against separate databases on ports `5433` and `5432`; both suites must pass. The job cleans up its integration container even on failure. The final `Verify` status requires all three jobs to pass.

CI retains the pnpm store and separate Vite+ build/unit-test task caches from `node_modules/.vite/task-cache`. Cache keys include the runner platform, Node version, dependency manifests, and commit; restore prefixes allow Vite+ to reuse unchanged tasks from earlier commits using its input tracking. CI opts unit tests into task caching with `pnpm exec vp run --cache test`; local `pnpm test` still executes tests directly. Type checks, dev, database, smoke, and integration tasks are not task-cached. Use `pnpm exec vp cache clean` to clear local task results, or bump the workflow's cache-key version to discard persisted CI caches.

New commits cancel superseded runs for the same pull request. Main-branch runs are not grouped or cancelled, so production deployment triggers are not interrupted. Only successful push CI on `main` queues both Dokploy applications; the deployment jobs confirm request acceptance, not deployment completion. Measure the next CI runs to confirm the startup/concurrency gains and cross-run cache hits.

Dokploy's selected build type has not been verified from this checkout. Before relying on `mise.toml` for deployment, check that the application's build type is Railpack and verify the generated image's toolchain. Do not copy ignored `mise.local.toml` files into production build contexts.

## Testing safely

Integration tests create a dedicated PostgreSQL container on port `5433`:

```text
postgresql://postgres:password@localhost:5433/tepirek-revamped-test
```

To use an existing test database, set `TEST_DATABASE_URL` and `API_INTEGRATION_ALLOW_DATABASE_RESET=1`. The suite applies the application schema and truncates that database, so **never point it at development or production data**.

## TypeScript tooling

[`tsrs`](https://github.com/oxc-project/tsrs) handles workspace type-checking and TypeScript editor features. `pnpm check-types` runs it across all workspaces; confirm the installed compiler with `pnpm exec tsrs --version`.

[`@maschwenk/tsrslint`](https://github.com/maschwenk/tsrslint) is Oxlint's Rust backend for standard type-aware rules and its native type-diagnostic pass. `tools/lint.ts` resolves the platform binary and sets `OXLINT_TSGOLINT_PATH` before launching Vite+, including in Zed. Use `pnpm check` rather than bare `vp check` to select this backend and run both lint passes.

Effect's native rules are not supported by tsrslint. `pnpm check:effect` runs them separately through `oxlint.effect.config.ts`, using the Effect-patched Go backend. `pnpm check` and staged checks run both passes; `pnpm fix` applies standard formatting/lint fixes and then validates Effect diagnostics. For targeted checks, use `node tools/lint.ts check <paths...>` and `node tools/lint.ts effect <paths...>`.

`pnpm install` runs `effect-tsgo patch --no-typescript --oxlint` for the separate Effect pass. `@effect/tsgo`, Oxlint, and oxlint-tsgolint must stay on compatible versions; see the [Effect Oxlint setup guide](https://github.com/Effect-TS/tsgo/blob/main/docs/README.md). Keep oxlint-tsgolint installed for that pass, even though standard checks use Rust. TypeScript remains installed for tooling compatibility but is not patched or used by the workspace check-types scripts.

The Effect pass preserves the previous rule severities. API and server production files additionally treat direct global fetch, environment, timer, and randomness access, plus unsafe Effect type assertions, as errors outside tests. These additional restrictions do not apply to the React web project. Effect rule severities live in `oxlint.effect.config.ts`; the shared tsconfig retains the allowed unstable API list for that linter.

### Zed

1. Install the **TypeScript Language Server** (`tsgo`) and **Oxc** extensions.
2. Open the repository root, run `pnpm install`, and trust the project's language-server commands if prompted. Node.js and pnpm must be available to Zed (launch it from a mise-enabled shell if necessary).
3. Run **editor: restart language server** after installation or dependency updates.

[`.zed/settings.json`](.zed/settings.json) launches `pnpm exec tsrs --lsp -stdio` through the `typescript-ls` adapter and `pnpm exec node tools/lint.ts lint --lsp` for Oxlint with tsrslint. It disables competing TypeScript servers for JavaScript, JSX, TypeScript, and TSX. Standard type-aware lint diagnostics appear live; native Effect diagnostics are checked separately with `pnpm check:effect` and do not appear in this Rust-backed Oxlint server. Effect-specific hover enhancements and refactors are not provided by tsrs.

Check Zed's language-server logs to confirm these commands are running. Other editors should use the same two commands rather than running an additional TypeScript server; see [tsrs editor setup](https://github.com/oxc-project/tsrs/blob/main/docs/LSP.md#editor-setup).

The pinned tools share support for glibc Linux x64/arm64 and Apple Silicon macOS, but not native Windows or Intel macOS. tsrslint does not ship musl binaries. On Windows, use Zed's WSL remote-development support and install dependencies inside WSL.

## Technical references

- [Margonem](https://www.margonem.com/) — the game this project supports
- [TanStack Start](https://tanstack.com/start/latest) and [React](https://react.dev/) — web application
- [Effect](https://effect.website/) — schemas, services, and HTTP contracts
- [Hono](https://hono.dev/) and [Node.js](https://nodejs.org/docs/latest-v24.x/api/) — server host and runtime
- [Better Auth](https://www.better-auth.com/docs) — sessions and Discord OAuth
- [Drizzle ORM](https://orm.drizzle.team/docs/overview) and [PostgreSQL](https://www.postgresql.org/docs/) — persistence
- [Vite+](https://viteplus.dev/guide) and [pnpm workspaces](https://pnpm.io/workspaces) — task running, builds, tests, linting, and formatting

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

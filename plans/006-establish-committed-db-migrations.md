# Plan 006: Establish committed Drizzle migrations

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat de43490..HEAD -- packages/db/drizzle.config.ts packages/db/package.json packages/db/src/schema packages/db/src/migrations README.md`
> If any in-scope file changed since this plan was written, compare the excerpts below against live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-establish-workspace-typecheck.md`
- **Category**: migration
- **Planned at**: commit `de43490`, 2026-06-19

## Why this matters

The README advertises `db:generate` and `db:migrate`, but the migrations directory has no committed migration files. Without a baseline migration history, fresh/staging/prod databases cannot be reproduced from version control, and later schema changes like auction unique constraints become riskier. This plan creates the migration baseline and documents the intended workflow.

## Current state

Relevant files:

- `packages/db/drizzle.config.ts` — Drizzle config; outputs to `./src/migrations`.
- `packages/db/package.json` — DB scripts.
- `packages/db/src/schema/**` — source of current schema.
- `packages/db/src/migrations/` — currently only an empty `meta/` directory.
- `README.md` — documents DB commands.

Excerpts:

```ts
// packages/db/drizzle.config.ts:9-14
export default defineConfig({
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  dialect: "postgresql",
  out: "./src/migrations",
  schema: "./src/schema",
});
```

```jsonc
// packages/db/package.json:12-16
"scripts": {
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
```

```md
// README.md:157-162
| `pnpm db:push` | Push schema changes |
| `pnpm db:generate` | Generate migrations |
| `pnpm db:migrate` | Run migrations |
```

Repo conventions:

- Database package uses Drizzle ORM and PostgreSQL.
- Commands are run through root Turbo scripts, e.g. `pnpm db:generate` delegates to `@tepirek-revamped/db`.
- Do not start Docker or run persistent services unless the operator explicitly allows it.

## Commands you will need

| Purpose             | Command                                                             | Expected on success                                                       |
| ------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Generate migrations | `pnpm --filter @tepirek-revamped/db db:generate -- --name baseline` | creates SQL migration and meta journal under `packages/db/src/migrations` |
| Typecheck           | `pnpm check-types`                                                  | exit 0                                                                    |
| Lint/format check   | `pnpm check`                                                        | exit 0                                                                    |

## Scope

**In scope**:

- `packages/db/src/migrations/**`
- `README.md`
- `packages/db/package.json` only if script names need clarifying

**Out of scope**:

- Schema changes.
- Applying migrations to a real database.
- Starting Docker or modifying local database state unless explicitly authorized.
- Replacing Drizzle.

## Git workflow

- Branch: `advisor/006-db-migration-baseline`
- Commit message: `chore(db): add drizzle migration baseline`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Generate a baseline migration

Run:

```bash
pnpm --filter @tepirek-revamped/db db:generate -- --name baseline
```

Confirm that Drizzle creates SQL migration files and metadata under `packages/db/src/migrations/`.

**Verify**: `find packages/db/src/migrations -type f | sort` → shows at least one `.sql` file and Drizzle meta files.

### Step 2: Inspect generated SQL for obvious drift

Open the generated SQL. Confirm it creates the tables represented by current schema files: auth tables, todo, event, announcement, auction, skills, hero/bet/user_stats tables.

Do not manually rewrite generated SQL except to remove obviously unsafe/incorrect output. If the generated migration is empty or wildly different from current schema, STOP.

**Verify**: `grep -R "CREATE TABLE" packages/db/src/migrations` → output includes multiple `CREATE TABLE` statements.

### Step 3: Document the migration workflow

Update `README.md` database section to clarify:

- `pnpm db:generate` creates committed migration files after schema changes.
- `pnpm db:migrate` applies committed migrations.
- `pnpm db:push` is for local prototyping only, not the normal shared/prod workflow.

Keep the concise table format.

**Verify**: `grep -n "db:push\|db:generate\|db:migrate" README.md` → descriptions reflect the distinction above.

### Step 4: Run checks

**Verify**:

- `pnpm check-types` → exit 0.
- `pnpm check` → exit 0.

## Test plan

No runtime DB test is required because applying migrations mutates a database. The verification is generated migration presence plus SQL inspection. If the operator provides a disposable database, optionally run `pnpm --filter @tepirek-revamped/db db:migrate` against it and confirm exit 0.

## Done criteria

- [ ] `packages/db/src/migrations/` contains committed baseline SQL and metadata files.
- [ ] README distinguishes generate/migrate from local push.
- [ ] No schema files changed in this plan.
- [ ] `pnpm check-types` and `pnpm check` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Drizzle generation fails due missing config/env.
- Generated migration is empty despite non-empty schema.
- Generated migration tries to drop or alter existing tables instead of creating a baseline.
- You need to run Docker or mutate a non-disposable database.

## Maintenance notes

Future schema plans should include a generated migration file in the same change. Reviewers should reject schema-only PRs unless they are explicitly local-prototype work.

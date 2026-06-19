# Plan 011: Add GitHub CI for checks, typecheck, and tests

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat de43490..HEAD -- .github package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json`
> If any in-scope file changed since this plan was written, compare the excerpts below against live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-establish-workspace-typecheck.md`, `plans/002-establish-vitest-baseline.md`
- **Category**: dx
- **Planned at**: commit `de43490`, 2026-06-19

## Why this matters

After Plans 001 and 002, the repo has local verification commands, but there is still no CI workflow to run them on pull requests. Without CI, regressions depend on each contributor remembering to run checks locally. A minimal GitHub Actions workflow makes typecheck, lint/format check, tests, and build visible before merge.

## Current state

Relevant files:

- `.github/` — currently contains only Copilot instructions, no workflow.
- `package.json` — root commands.
- `pnpm-workspace.yaml` — pnpm workspace and build dependency settings.
- `turbo.json` — task graph.

Excerpts:

```jsonc
// package.json:14-29
"dev": "turbo dev",
"build": "turbo build",
"check-types": "turbo check-types",
...
"check": "ultracite check",
"fix": "ultracite fix"
```

```yaml
# pnpm-workspace.yaml:1-3
packages:
  - apps/*
  - packages/*
```

```jsonc
// package.json:46
"packageManager": "pnpm@11.8.0"
```

Repo conventions:

- pnpm is the package manager.
- Avoid running persistent dev or database commands in CI.
- `pnpm check` is check-only, while `pnpm fix` mutates code and must not be used in CI.

## Commands you will need

| Purpose              | Command            | Expected on success              |
| -------------------- | ------------------ | -------------------------------- |
| Local check          | `pnpm check`       | exit 0                           |
| Local typecheck      | `pnpm check-types` | exit 0                           |
| Local tests          | `pnpm test`        | exit 0                           |
| Optional local build | `pnpm build`       | exit 0 if operator permits build |

## Scope

**In scope**:

- `.github/workflows/ci.yml` (create)
- `package.json` only if Plan 002 did not add a root `test` script

**Out of scope**:

- Deployment workflows.
- Secrets, environments, or production database access.
- Docker/Postgres service setup.
- Auto-fix formatting in CI.

## Git workflow

- Branch: `advisor/011-github-ci`
- Commit message: `ci: add pull request verification workflow`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Create the workflow

Create `.github/workflows/ci.yml` with:

- name: `CI`
- triggers: `pull_request` and `push` to `main`
- permissions: `contents: read`
- one job on `ubuntu-latest`
- checkout action
- Node setup using the Node version from README (`20+`; choose Node 22 if no `.nvmrc` exists)
- pnpm setup matching `packageManager` (`11.8.0`)
- dependency install with `pnpm install --frozen-lockfile`
- commands:
  - `pnpm check`
  - `pnpm check-types`
  - `pnpm test`

Add Turbo cache only if straightforward; do not add remote cache secrets.

**Verify**: `test -f .github/workflows/ci.yml && grep -n "pnpm check\|pnpm check-types\|pnpm test" .github/workflows/ci.yml` → all three commands are present.

### Step 2: Consider build separately

If `pnpm build` is cheap and does not require env/database, add it after tests. If it requires production env vars or writes unexpected artifacts, leave build out and add a YAML comment explaining why build is intentionally excluded.

Do not add database services unless a specific test requires them.

**Verify**: `grep -n "pnpm build\|build intentionally" .github/workflows/ci.yml` → either build command or explanatory comment exists.

### Step 3: Run local commands

Run the same commands locally before finishing.

**Verify**:

- `pnpm check` → exit 0.
- `pnpm check-types` → exit 0.
- `pnpm test` → exit 0.
- If included in CI, `pnpm build` → exit 0.

## Test plan

The workflow is the test harness. Local verification must match the commands in the workflow. If the repo has a GitHub remote, a reviewer can confirm the workflow appears on the next PR.

## Done criteria

- [ ] `.github/workflows/ci.yml` exists.
- [ ] CI installs with pnpm frozen lockfile.
- [ ] CI runs `pnpm check`, `pnpm check-types`, and `pnpm test`.
- [ ] CI does not run mutating commands like `pnpm fix`, `db:push`, or `db:migrate`.
- [ ] Local matching commands pass.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Plan 001 or Plan 002 is not complete.
- `pnpm install --frozen-lockfile` fails because the lockfile is already out of sync.
- Build requires secrets or a database and cannot be safely run in CI.
- The repo uses a CI provider other than GitHub Actions despite `.github/` being present.

## Maintenance notes

Keep CI boring. Add database integration services only when there are database tests that require them, and keep those tests isolated from production data.

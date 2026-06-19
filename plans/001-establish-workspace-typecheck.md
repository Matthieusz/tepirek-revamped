# Plan 001: Make workspace typechecking cover every package

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat de43490..HEAD -- package.json turbo.json apps/web/package.json apps/server/package.json packages/api/package.json packages/auth/package.json packages/config/package.json packages/db/package.json`
> If any in-scope file changed since this plan was written, compare the excerpts below against live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `de43490`, 2026-06-19

## Why this matters

The root `pnpm check-types` command currently delegates to Turbo, but Turbo only runs tasks in workspaces that define a matching script. The server package has `check-types`; web, api, auth, db, and config do not. This creates false confidence: TypeScript errors outside the server can land while the documented verification command still exits successfully.

## Current state

Relevant files:

- `package.json` — root scripts; currently has `"check-types": "turbo check-types"`.
- `turbo.json` — declares the `check-types` task.
- `apps/server/package.json` — exemplar package with an existing `check-types` script.
- `apps/web/package.json`, `packages/api/package.json`, `packages/auth/package.json`, `packages/config/package.json`, `packages/db/package.json` — workspaces missing `check-types`.

Excerpts:

```jsonc
// package.json:14-16
"build": "turbo build",
"check-types": "turbo check-types",
"dev:native": "turbo -F native dev",
```

```jsonc
// apps/server/package.json:5-8
"scripts": {
  "build": "tsdown",
  "check-types": "tsc -b",
```

```jsonc
// apps/web/package.json:5-10
"scripts": {
  "build": "vite build",
  "serve": "vite preview",
  "dev": "vite dev --port=3001",
  "start": "node .output/server/index.mjs"
}
```

Repo conventions:

- Package manager: pnpm 11 (`package.json:46`).
- TypeScript config is strict. Shared packages extend `@tepirek-revamped/config/tsconfig.base.json`; web uses `noEmit` in `apps/web/tsconfig.json`.
- Keep scripts simple and named consistently with root/Turbo task names.

## Commands you will need

| Purpose             | Command                                 | Expected on success                                                   |
| ------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| Typecheck           | `pnpm check-types`                      | exit 0, TypeScript checks every workspace with a `check-types` script |
| Lint/format check   | `pnpm check`                            | exit 0                                                                |
| Inspect Turbo tasks | `pnpm turbo run check-types --dry=json` | JSON includes web, server, api, auth, config, db check-types tasks    |

## Scope

**In scope**:

- `package.json`
- `turbo.json` only if needed for outputs/cache metadata
- `apps/web/package.json`
- `apps/server/package.json` only if needed to keep scripts consistent
- `packages/api/package.json`
- `packages/auth/package.json`
- `packages/config/package.json`
- `packages/db/package.json`

**Out of scope**:

- Source TypeScript fixes, except trivial package-script-only changes. If typecheck reveals existing source errors, STOP and report them.
- Build scripts, dev scripts, dependency upgrades.

## Git workflow

- Branch: `advisor/001-workspace-typecheck`
- Commit message style: conventional commits, e.g. `chore: add workspace typecheck scripts`.
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add missing package scripts

Add `check-types` scripts:

- `apps/web/package.json`: `"check-types": "tsc --noEmit"` because web tsconfig already has `noEmit` and is not composite.
- `packages/api/package.json`: `"check-types": "tsc -b"`.
- `packages/auth/package.json`: `"check-types": "tsc -b"`.
- `packages/config/package.json`: `"check-types": "tsc --noEmit"` because it only exports config/constants and has no composite package tsconfig.
- `packages/db/package.json`: `"check-types": "tsc -b"`.

Preserve existing script ordering: keep `build`, `check-types`, `dev` grouped where scripts already exist.

**Verify**: `pnpm turbo run check-types --dry=json` → output JSON includes tasks for `web`, `server`, `@tepirek-revamped/api`, `@tepirek-revamped/auth`, `@tepirek-revamped/config`, and `@tepirek-revamped/db`.

### Step 2: Run the real typecheck

Run the root command.

**Verify**: `pnpm check-types` → exit 0. If it fails due source errors, STOP and report the exact failing files; do not fix them in this plan.

### Step 3: Run repo check mode

Run the existing check command.

**Verify**: `pnpm check` → exit 0. If it only reports formatting of the package files you changed, run the repo formatter only when the operator allows mutation; otherwise STOP and report.

## Test plan

No runtime tests are added in this plan. This plan establishes typecheck coverage. The regression check is Turbo dry-run plus `pnpm check-types`.

## Done criteria

- [ ] Every workspace package has a `check-types` script.
- [ ] `pnpm turbo run check-types --dry=json` includes all expected workspaces.
- [ ] `pnpm check-types` exits 0 or the executor stopped with existing source errors.
- [ ] `pnpm check` exits 0.
- [ ] No source files are modified.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Any in-scope file differs materially from the excerpts.
- `pnpm check-types` reveals source errors.
- Fixing verification would require editing TypeScript source files.
- The package manager is no longer pnpm.

## Maintenance notes

When adding a new workspace, require a package-local `check-types` script so the root command continues to mean “whole repo.” Reviewers should check Turbo dry-run output, not just command exit status.

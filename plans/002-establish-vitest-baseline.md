# Plan 002: Add a minimal Vitest regression baseline

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat de43490..HEAD -- package.json pnpm-lock.yaml turbo.json packages/config/package.json packages/config/src/index.ts`
> If any in-scope file changed since this plan was written, compare the excerpts below against live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: `plans/001-establish-workspace-typecheck.md`
- **Category**: tests
- **Planned at**: commit `de43490`, 2026-06-19

## Why this matters

The repo has auth, authorization, betting, auction, and ranking logic, but no test runner or committed tests. Executor agents and maintainers need a cheap, deterministic command before changing security or data-integrity behavior. This plan adds the smallest useful Vitest baseline without touching database-backed code yet.

## Current state

Relevant files:

- `package.json` — root scripts and dev dependencies; no `test` script.
- `turbo.json` — tasks for build/lint/typecheck/dev/db only.
- `packages/config/src/index.ts` — pure constants/type guards suitable for a first no-DB unit test.
- `packages/config/package.json` — package metadata, currently no scripts.

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

```ts
// packages/config/src/index.ts:8-16
export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];
...
export const EVENT_ICON_IDS = [
  "egg",
  "sun",
```

```ts
// packages/config/src/index.ts:31-32
export const isEventIconId = (value: string): value is EventIconId =>
  EVENT_ICON_IDS.some((eventIconId) => eventIconId === value);
```

Repo conventions:

- Prefer Vitest for TypeScript tests.
- Use `for...of` rather than `.forEach()`.
- No `any`, no non-null assertions.
- Keep tests semantically meaningful, not snapshots.

## Commands you will need

| Purpose            | Command              | Expected on success                                 |
| ------------------ | -------------------- | --------------------------------------------------- |
| Install dependency | `pnpm add -D vitest` | exit 0, `package.json` and `pnpm-lock.yaml` updated |
| Tests              | `pnpm test`          | exit 0, config tests pass                           |
| Typecheck          | `pnpm check-types`   | exit 0                                              |
| Lint/format check  | `pnpm check`         | exit 0                                              |

## Scope

**In scope**:

- `package.json`
- `pnpm-lock.yaml`
- `turbo.json`
- `packages/config/package.json`
- `packages/config/src/index.test.ts` (create)

**Out of scope**:

- Database integration tests.
- API/router tests.
- Playwright/E2E setup.
- Source behavior changes in `packages/config/src/index.ts`.

## Git workflow

- Branch: `advisor/002-vitest-baseline`
- Commit message: `test: add vitest baseline`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add Vitest and scripts

Run `pnpm add -D vitest` at repo root. Then add:

- root `package.json`: `"test": "turbo test"`.
- `turbo.json`: task `"test": { "dependsOn": ["^test"] }`.
- `packages/config/package.json`: `"scripts": { "test": "vitest run" }`.

Do not add test scripts to packages that do not yet have tests; Turbo should run only workspaces with a `test` script.

**Verify**: `pnpm turbo run test --dry=json` → output includes `@tepirek-revamped/config#test` and no failing package-resolution errors.

### Step 2: Add first pure unit tests

Create `packages/config/src/index.test.ts`. Test these cases:

- `isEventIconId` returns true for every `EVENT_ICON_IDS` value.
- `isEventIconId` returns false for invalid strings such as `""`, `"dragon"`, and `"Egg"`.
- `isAuctionType` accepts every `AUCTION_TYPES` value and rejects invalid values.
- `isAuctionProfession` accepts every `AUCTION_PROFESSIONS` value and rejects invalid values.

Use Vitest imports:

```ts
import { describe, expect, it } from "vitest";
```

Avoid `.forEach()`; use `for...of` loops.

**Verify**: `pnpm --filter @tepirek-revamped/config test` → exit 0, all new tests pass.

### Step 3: Run repo verification

Run all relevant root checks.

**Verify**:

- `pnpm test` → exit 0.
- `pnpm check-types` → exit 0.
- `pnpm check` → exit 0.

## Test plan

The new tests are the plan's output. They should be deterministic, pure, and not require env vars, database, Docker, or network.

## Done criteria

- [ ] Root `pnpm test` exists and exits 0.
- [ ] `packages/config/src/index.test.ts` exists and tests positive and negative cases.
- [ ] `pnpm check-types` exits 0.
- [ ] `pnpm check` exits 0.
- [ ] No production source behavior changed.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Plan 001 is not complete.
- Installing Vitest changes the package manager or major lockfile structure unexpectedly.
- Tests require env vars, Docker, network, or database to pass.
- Typecheck fails in unrelated source files.

## Maintenance notes

Future plans should add focused tests near the code they change. Keep this baseline small; do not turn it into a catch-all test utilities package unless multiple packages need shared helpers.

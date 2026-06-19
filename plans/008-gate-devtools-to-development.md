# Plan 008: Gate React Query and Router devtools to development

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat de43490..HEAD -- apps/web/src/routes/__root.tsx apps/web/vite.config.ts apps/web/package.json`
> If any in-scope file changed since this plan was written, compare the excerpts below against live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-establish-workspace-typecheck.md`
- **Category**: security
- **Planned at**: commit `de43490`, 2026-06-19

## Why this matters

React Query Devtools and TanStack Router Devtools are mounted unconditionally in the root document. They are useful in development but should not be shipped or rendered for production users because they add bundle surface and expose internal route/query state.

## Current state

Relevant file:

- `apps/web/src/routes/__root.tsx` — root document imports and renders both devtools.

Excerpts:

```tsx
// apps/web/src/routes/__root.tsx:1-9
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
...
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
```

```tsx
// apps/web/src/routes/__root.tsx:27-29
<Toaster richColors />
<TanStackRouterDevtools position="bottom-right" />
<ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
<Scripts />
```

Repo conventions:

- TanStack Start/Vite app uses `import.meta.env` in client code, e.g. `apps/web/src/utils/orpc.ts` uses `import.meta.env.VITE_SERVER_URL`.
- Keep root document simple.
- No broad routing refactors.

## Commands you will need

| Purpose           | Command                   | Expected on success                                                |
| ----------------- | ------------------------- | ------------------------------------------------------------------ |
| Typecheck         | `pnpm check-types`        | exit 0                                                             |
| Lint/format check | `pnpm check`              | exit 0                                                             |
| Build smoke       | `pnpm --filter web build` | exit 0 if operator allows build; otherwise skip and report not run |

## Scope

**In scope**:

- `apps/web/src/routes/__root.tsx`

**Out of scope**:

- Removing devtool dependencies from `apps/web/package.json`.
- Changing router/query setup.
- Analytics script changes.

## Git workflow

- Branch: `advisor/008-devtools-development-only`
- Commit message: `fix(web): render devtools only in development`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a development-only guard

In `apps/web/src/routes/__root.tsx`, introduce a boolean near `RootDocument`, for example:

```ts
const showDevtools = import.meta.env.DEV;
```

Render devtools only when `showDevtools` is true:

```tsx
{
  showDevtools ? (
    <>
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
    </>
  ) : null;
}
```

Keep imports static unless lint/build requires dynamic imports. Do not remove devtools from dev mode.

**Verify**: `pnpm check-types` → exit 0.

### Step 2: Run checks

**Verify**:

- `pnpm check` → exit 0.
- If the operator permits builds, `pnpm --filter web build` → exit 0.

## Test plan

No new automated test is required. Manual check: run the web app in development and confirm devtools appear; build or preview production and confirm devtools do not render.

## Done criteria

- [ ] Devtools render only when `import.meta.env.DEV` is true.
- [ ] Development behavior is preserved.
- [ ] `pnpm check-types` and `pnpm check` exit 0.
- [ ] Build command run if permitted, or explicitly reported as not run.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- `import.meta.env.DEV` is unavailable in this TanStack Start route file.
- Static devtool imports still force production-visible UI despite conditional rendering.
- Fixing requires package/dependency changes.

## Maintenance notes

If bundle size becomes a concern, a follow-up can lazy-load devtools in development only. This plan intentionally keeps the change minimal.

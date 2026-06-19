# Plan 009: Set the document language to Polish

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat de43490..HEAD -- apps/web/src/routes/__root.tsx PRODUCT.md README.md`
> If any in-scope file changed since this plan was written, compare the excerpts below against live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-establish-workspace-typecheck.md`
- **Category**: docs
- **Planned at**: commit `de43490`, 2026-06-19

## Why this matters

The product is for primarily Polish-speaking guild members and the UI copy is Polish, but the root HTML document declares `lang="en"`. Screen readers, browser translation, spellcheck, and search/language heuristics use this attribute. Setting it to Polish is a low-risk accessibility fix.

## Current state

Relevant files:

- `apps/web/src/routes/__root.tsx` — root HTML document and root error boundary.
- `PRODUCT.md` — states the user/copy language intent.
- `apps/web/src/routes/index.tsx` — example Polish UI copy.

Excerpts:

```md
// PRODUCT.md:7-17
Margonem MMORPG guild members, primarily Polish-speaking players.
...
Voice is direct and functional; Polish copy should feel natural, not translated.
```

```tsx
// apps/web/src/routes/__root.tsx:18-20
const RootDocument = () => (
  <html className="dark" lang="en" suppressHydrationWarning>
```

```tsx
// apps/web/src/routes/__root.tsx:35-38
const RootErrorBoundary = ({ error, reset }: { ... }) => (
  <html className="dark" lang="en">
```

```tsx
// apps/web/src/routes/index.tsx:43-57
<p>Strona klanowa Gildii Złodziei.</p>
...
Zaloguj się
```

Repo conventions:

- Keep Polish UI copy natural and direct.
- Root document is in `apps/web/src/routes/__root.tsx`.

## Commands you will need

| Purpose           | Command            | Expected on success |
| ----------------- | ------------------ | ------------------- |
| Typecheck         | `pnpm check-types` | exit 0              |
| Lint/format check | `pnpm check`       | exit 0              |

## Scope

**In scope**:

- `apps/web/src/routes/__root.tsx`

**Out of scope**:

- Translating copy.
- Adding i18n framework.
- Per-route language switching.
- Metadata/SEO overhaul.

## Git workflow

- Branch: `advisor/009-polish-html-lang`
- Commit message: `fix(a11y): set root language to polish`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Change root document language

In `apps/web/src/routes/__root.tsx`, change both root `<html>` elements from `lang="en"` to `lang="pl"`:

- `RootDocument`
- `RootErrorBoundary`

Do not change copy or layout.

**Verify**: `grep -n 'lang="en"\|lang="pl"' apps/web/src/routes/__root.tsx` → only `lang="pl"` matches for root html elements.

### Step 2: Run checks

**Verify**:

- `pnpm check-types` → exit 0.
- `pnpm check` → exit 0.

## Test plan

No automated test required. Manual accessibility check: inspect the rendered `<html>` element and confirm `lang="pl"`.

## Done criteria

- [ ] Both root HTML elements use `lang="pl"`.
- [ ] No unrelated copy/layout changes.
- [ ] `pnpm check-types` and `pnpm check` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The app now supports multiple locales and `lang` must be dynamic.
- Root document moved to another file.

## Maintenance notes

If the app later becomes multilingual, replace the static `pl` with route/session-derived language metadata and test it. Until then, static Polish matches the product brief and current copy.

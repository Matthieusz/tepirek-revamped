# Plan 007: Enforce auction slot uniqueness in the database

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat de43490..HEAD -- packages/db/src/schema/auction.ts packages/db/src/migrations packages/api/src/routers/auction.ts apps/web/src/components/auction-table.tsx`
> If any in-scope file changed since this plan was written, compare the excerpts below against live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/006-establish-committed-db-migrations.md`
- **Category**: bug
- **Planned at**: commit `de43490`, 2026-06-19

## Why this matters

Auction slots are intended to allow one user per `(profession, type, level, round, column)` cell, but that invariant is enforced only by a read-before-insert in application code. Two concurrent requests can both see an empty cell and insert duplicates. The UI already contains duplicate-tolerant fallback code, which is a signal that historical duplicates are possible.

## Current state

Relevant files:

- `packages/db/src/schema/auction.ts` — auction signup schema; has a non-unique index only.
- `packages/api/src/routers/auction.ts` — read-before-insert toggle logic.
- `apps/web/src/components/auction-table.tsx` — groups duplicate signups and displays one.
- `packages/db/src/migrations/**` — migration files after Plan 006.

Excerpts:

```ts
// packages/db/src/schema/auction.ts:10-27
export const auction = pgTable(
  "auction_signups",
  {
    column: integer("column").notNull(),
    ...
    profession: text("profession").notNull(),
    round: integer("round").notNull(),
    type: text("type").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => ({
    professionTypeIdx: index("profession_type_idx").on(table.profession, table.type),
  })
);
```

```ts
// packages/api/src/routers/auction.ts:104-117
const existingCell = await db
  .select({ id: auction.id, userId: auction.userId })
  .from(auction)
  .where(
    and(
      eq(auction.profession, input.profession),
      eq(auction.type, input.type),
      eq(auction.level, input.level),
      eq(auction.round, input.round),
      eq(auction.column, input.column)
    )
  )
  .limit(1);
```

```tsx
// apps/web/src/components/auction-table.tsx:205-220
const signupMap = new Map<string, SignupData[]>();
for (const signup of signups ?? []) {
  const key = `${signup.level}-${signup.round}-${signup.column}`;
  const existing = signupMap.get(key) ?? [];
  existing.push(signup);
  signupMap.set(key, existing);
}
```

Repo conventions:

- Use Drizzle schema as the source of DB truth.
- Use `ORPCError("CONFLICT")` for occupied auction cells.
- Use Zod schemas to validate procedure inputs.
- No unsafe casts or non-null assertions.

## Commands you will need

| Purpose            | Command                                                                        | Expected on success                               |
| ------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| Generate migration | `pnpm --filter @tepirek-revamped/db db:generate -- --name auction-slot-unique` | creates migration for new unique index/constraint |
| Tests              | `pnpm test`                                                                    | exit 0                                            |
| Typecheck          | `pnpm check-types`                                                             | exit 0                                            |
| Lint/format check  | `pnpm check`                                                                   | exit 0                                            |

## Scope

**In scope**:

- `packages/db/src/schema/auction.ts`
- generated file(s) under `packages/db/src/migrations/**`
- `packages/api/src/routers/auction.ts`
- `packages/api/src/routers/auction.test.ts` if adding pure tests is feasible

**Out of scope**:

- Auction page redesign.
- Changing auction table dimensions, professions, or route params.
- Cleaning existing duplicate production data automatically. If duplicates exist, STOP and report a data-cleanup requirement.

## Git workflow

- Branch: `advisor/007-auction-slot-uniqueness`
- Commit message: `fix(auction): enforce unique signup slots`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add a database uniqueness constraint

In `packages/db/src/schema/auction.ts`, import `uniqueIndex` from `drizzle-orm/pg-core` and add a unique index over:

- `profession`
- `type`
- `level`
- `round`
- `column`

Use a clear name such as `auction_slot_unique_idx`. Keep or replace the existing `professionTypeIdx`; if the unique index starts with `profession,type`, it may make the old index redundant, but do not remove the old index unless you are certain Drizzle will generate a safe migration.

**Verify**: `pnpm check-types` → exit 0.

### Step 2: Generate the migration

Run:

```bash
pnpm --filter @tepirek-revamped/db db:generate -- --name auction-slot-unique
```

Inspect the generated SQL. It should add a unique index/constraint. It must not drop auction data.

**Verify**: `grep -R "auction_slot_unique\|UNIQUE" packages/db/src/migrations` → output shows the new unique constraint/index.

### Step 3: Make toggle logic concurrency-safe

In `packages/api/src/routers/auction.ts`:

1. Tighten input validation where possible: `column`, `level`, and `round` should be integers and positive; use existing domain limits if obvious from UI (`column` 1-3, `round` 1-4, `level` 30-300 by tens) but do not overfit if server allows future values.
2. Keep the existing behavior: if current user owns the existing cell, delete it and return `{ action: "removed" }`; if another user owns it, throw `ORPCError("CONFLICT")`.
3. For insert, rely on the database unique constraint. Prefer an insert with conflict handling (`onConflictDoNothing`) and check whether a row was inserted; if not inserted due conflict, throw `ORPCError("CONFLICT", { message: "To pole jest już zajęte" })`.
4. Do not return success if the insert did not happen.

If Drizzle conflict handling is awkward for this dialect, use a transaction and catch the specific Postgres unique-violation error without using `any`. If the error type cannot be narrowed safely, STOP and report.

**Verify**: `pnpm check-types` → exit 0.

### Step 4: Add focused tests if feasible

If API test infrastructure exists, extract any pure key/validation helper needed for tests and cover:

- same cell key maps same values.
- invalid column/round/level inputs are rejected by the Zod schema if exported/testable.

Do not mock a real database unless the repo already has a safe pattern.

**Verify**: `pnpm test` → exit 0.

### Step 5: Final checks

**Verify**:

- `pnpm check-types` → exit 0.
- `pnpm check` → exit 0.
- `pnpm test` → exit 0.

## Test plan

Automated pure tests are acceptable for validation helpers. Manual or integration verification should use a disposable DB: issue two concurrent signup calls for the same cell and confirm only one row exists and one call reports conflict.

## Done criteria

- [ ] DB schema has a unique slot constraint/index.
- [ ] A migration file adds that constraint/index without dropping data.
- [ ] API insertion cannot silently create duplicates under concurrency.
- [ ] Existing toggle-off-own-signup behavior remains.
- [ ] `pnpm test`, `pnpm check-types`, and `pnpm check` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Plan 006 migration baseline is not complete.
- Existing data contains duplicate auction slots, because the migration will fail until data is cleaned.
- Drizzle cannot express the unique index cleanly.
- Handling unique-violation errors would require unsafe `any` or broad swallowing of DB errors.

## Maintenance notes

The database is now the source of truth for slot occupancy. Future auction UI changes may display more columns/rounds, but must preserve the same uniqueness invariant or update the constraint deliberately.

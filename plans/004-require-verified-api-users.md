# Plan 004: Require verified users for application API procedures

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat de43490..HEAD -- packages/api/src/routers/procedures.ts packages/api/src/routers apps/web/src/lib/route-helpers.ts`
> If any in-scope file changed since this plan was written, compare the excerpts below against live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/003-move-discord-verification-server-side.md`
- **Category**: security
- **Planned at**: commit `de43490`, 2026-06-19

## Why this matters

The UI redirects unverified users to the waiting room, but the API only checks that a session exists. Any authenticated unverified account can call most `protectedProcedure` routers directly. Verification is a server-side authorization property and must be enforced in API middleware, not only in frontend routes.

## Current state

Relevant files:

- `packages/api/src/routers/procedures.ts` — defines `publicProcedure`, `protectedProcedure`, `adminProcedure`.
- `packages/api/src/routers/*.ts` — routers import `protectedProcedure` for most application data reads/writes.
- `apps/web/src/lib/route-helpers.ts` — frontend route guards already distinguish verified/unverified users.

Excerpts:

```ts
// packages/api/src/routers/procedures.ts:16-27
const requireAuth = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({ context: { session: context.session } });
});

export const protectedProcedure = publicProcedure.use(requireAuth);
```

```ts
// packages/api/src/routers/procedures.ts:29-37
const requireAdmin = o.middleware(({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  if (context.session.user.role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }
```

```ts
// apps/web/src/lib/route-helpers.ts:18-25
export const requireVerified = async (): Promise<AuthSession> => {
  const session = await requireAuth();
  if (!session.user.verified) {
    throw redirect({ to: "/waiting-room" });
  }
  return session;
};
```

Repo conventions:

- Use oRPC middleware for cross-cutting auth rules.
- Use `ORPCError("UNAUTHORIZED")` for no session and `ORPCError("FORBIDDEN")` for authenticated-but-not-allowed.
- Keep illegal states explicit; do not rely on client redirects for server authorization.

## Commands you will need

| Purpose              | Command                                                 | Expected on success                           |
| -------------------- | ------------------------------------------------------- | --------------------------------------------- |
| Search route imports | `grep -R "protectedProcedure" packages/api/src/routers` | only intentionally auth-only endpoints remain |
| Tests                | `pnpm test`                                             | exit 0                                        |
| Typecheck            | `pnpm check-types`                                      | exit 0                                        |
| Lint/format check    | `pnpm check`                                            | exit 0                                        |

## Scope

**In scope**:

- `packages/api/src/routers/procedures.ts`
- `packages/api/src/routers/*.ts`
- `packages/api/src/routers/procedures.test.ts` or focused tests if feasible

**Out of scope**:

- Frontend route guards; they already exist.
- Admin UI behavior changes.
- Discord verification flow; handled by Plan 003.
- Database schema changes.

## Git workflow

- Branch: `advisor/004-verified-api-users`
- Commit message: `fix(auth): require verified users for app api`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add verified middleware

In `packages/api/src/routers/procedures.ts`, add a middleware after `requireAuth`, for example `requireVerified`. It must:

1. Require `context.session?.user` just like `requireAuth`.
2. Check `context.session.user.verified === true`.
3. Throw `new ORPCError("FORBIDDEN", { message: "Konto oczekuje na weryfikację" })` when authenticated but unverified.
4. Return `next({ context: { session: context.session } })` on success.

Export a new `verifiedProcedure = protectedProcedure.use(requireVerified)`.

Update `requireAdmin` to also require `verified === true` before checking role, or compose it so admin users must be verified too.

**Verify**: `pnpm check-types` → may fail only because routers have not yet imported `verifiedProcedure`; continue to Step 2.

### Step 2: Move application routers from protected to verified

Replace `protectedProcedure` with `verifiedProcedure` for app data that verified guild members should access:

- `announcement.getAll`
- `auction.getSignups`, `auction.getStats`, `auction.removeSignup`, `auction.toggleSignup`
- `bet` read procedures
- `event.getAll`
- `heroes.getAll`, `heroes.getByEventId`
- `ranking` procedures
- `skills` non-admin read/create skill procedures, if skill creation should require verified membership
- `todo` procedures
- `user.getVerified`, `user.list`, `user.updateProfile`, and other member-only user operations
- `vault` protected read procedures

Keep auth/bootstrap procedures as `protectedProcedure` where unverified users must still call them:

- `user.getSession`
- the Plan 003 Discord verification procedure
- any endpoint needed by the waiting room before verification

Admin procedures should remain `adminProcedure` after Step 1 makes admin imply verified.

**Verify**: `grep -R "protectedProcedure" packages/api/src/routers` → remaining matches are only `procedures.ts`, auth/bootstrap endpoints in `user.ts`, and imports needed by those endpoints.

### Step 3: Add middleware tests if feasible

Add focused tests for the middleware behavior. If direct oRPC middleware testing is awkward, extract small pure predicates in `procedures.ts`, for example:

- `isVerifiedSession(session): boolean`
- `isAdminSession(session): boolean`

Test:

- null session is not verified/admin.
- authenticated unverified user is not verified.
- verified normal user is verified but not admin.
- verified admin is admin.

Do not weaken types with `any`; construct minimal typed fixtures or use `unknown` plus parser helpers.

**Verify**: `pnpm test` → exit 0.

### Step 4: Final verification

**Verify**:

- `pnpm check-types` → exit 0.
- `pnpm check` → exit 0.
- `pnpm test` → exit 0.

## Test plan

Add tests for the authorization predicate/middleware behavior. Reviewers should also manually verify that an unverified session can load waiting room verification but receives FORBIDDEN from member-only routers.

## Done criteria

- [ ] A distinct verified API procedure exists.
- [ ] App data routers use `verifiedProcedure` or `adminProcedure`, not bare `protectedProcedure`.
- [ ] Unverified users can still call only waiting-room/bootstrap verification endpoints.
- [ ] Admin access requires both verified and role `admin`.
- [ ] `pnpm test`, `pnpm check-types`, and `pnpm check` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Plan 003 is not complete, because this plan depends on a safe waiting-room verification endpoint.
- It is unclear whether a router is required by unverified users.
- The middleware cannot access `verified` on the session user type.
- Typecheck reveals unrelated source errors.

## Maintenance notes

When adding new routers, choose `publicProcedure`, `protectedProcedure`, `verifiedProcedure`, or `adminProcedure` intentionally. Reviewers should reject member data endpoints that use bare `protectedProcedure` unless they are explicitly needed before verification.

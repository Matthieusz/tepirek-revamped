# Plan 003: Move Discord guild verification fully server-side

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat de43490..HEAD -- packages/api/src/routers/user.ts apps/web/src/pages/'(auth)'/waiting-room.tsx packages/db/src/schema/auth.ts`
> If any in-scope file changed since this plan was written, compare the excerpts below against live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/002-establish-vitest-baseline.md`
- **Category**: security
- **Planned at**: commit `de43490`, 2026-06-19

## Why this matters

Any authenticated user can currently send an access token to `validateDiscordGuild` and then call `verifySelf` to mark their own account verified. Verification is a trust boundary: it should be owned by the server using the session user's linked Discord account, not by client-provided token data. This also avoids exposing provider access tokens to browser code.

## Current state

Relevant files:

- `packages/api/src/routers/user.ts` — user router; exposes `getDiscordAccessToken`, `validateDiscordGuild`, and `verifySelf`.
- `apps/web/src/pages/(auth)/waiting-room.tsx` — waiting room UI; fetches token, calls validation, then calls `verifySelf`.
- `packages/db/src/schema/auth.ts` — Better Auth account table; stores provider IDs and access tokens.

Excerpts:

```ts
// packages/api/src/routers/user.ts:48-53
getDiscordAccessToken: protectedProcedure.handler(async ({ context }) => {
  const rows = await db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(eq(account.userId, context.session.user.id));
  return rows[0]?.accessToken ?? null;
}),
```

```ts
// packages/api/src/routers/user.ts:103-130
validateDiscordGuild: protectedProcedure
  .input(z.object({ accessToken: z.string().min(1) }))
  .handler(async ({ input }) => {
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    ...
  }),
verifySelf: protectedProcedure.handler(({ context }) =>
  db.update(user).set({ updatedAt: new Date(), verified: true })
```

```tsx
// apps/web/src/pages/(auth)/waiting-room.tsx:27-50
const { data: accessToken } = useQuery(
  orpc.user.getDiscordAccessToken.queryOptions()
);
...
const result = await orpc.user.validateDiscordGuild.call({ accessToken });
if (result?.valid) {
  await orpc.user.verifySelf.call();
```

Product/auth intent:

- `README.md` says users wait until an admin verifies them or they are approved through membership in the configured Discord server.

Repo conventions:

- Use oRPC procedures with Zod input schemas where input exists.
- Use `ORPCError` for expected API errors.
- Keep user-facing copy Polish.
- No `any`, no non-null assertions, no unsafe type assertions.

## Commands you will need

| Purpose           | Command            | Expected on success |
| ----------------- | ------------------ | ------------------- |
| Unit tests        | `pnpm test`        | exit 0              |
| Typecheck         | `pnpm check-types` | exit 0              |
| Lint/format check | `pnpm check`       | exit 0              |

## Scope

**In scope**:

- `packages/api/src/routers/user.ts`
- `packages/api/src/routers/user.test.ts` (create if Plan 002 test setup exists)
- `apps/web/src/pages/(auth)/waiting-room.tsx`

**Out of scope**:

- Better Auth provider configuration.
- Database schema changes.
- Admin verification UI.
- Route-level verified API gating; that is Plan 004.

## Git workflow

- Branch: `advisor/003-server-side-discord-verification`
- Commit message: `fix(auth): verify discord membership server-side`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Replace token-returning API with server-owned verification

In `packages/api/src/routers/user.ts`:

1. Remove `getDiscordAccessToken` from the public router API.
2. Replace `validateDiscordGuild` and `verifySelf` with one procedure, e.g. `verifyDiscordGuildMembership`.
3. The new procedure must take no input.
4. It must select the current session user's Discord `account.accessToken` from the DB. Include `eq(account.userId, context.session.user.id)` and `eq(account.providerId, "discord")` in the where clause.
5. If no token exists, return `{ valid: false }` or throw a recoverable `ORPCError("BAD_REQUEST", { message: "Połącz konto Discord, aby zweryfikować członkostwo" })`. Pick one behavior and keep the UI aligned.
6. Fetch `https://discord.com/api/users/@me/guilds` using the server-owned token.
7. Parse the response with `z.array(z.object({ id: z.string() }))` as today.
8. If `DISCORD_SERVER_ID` is absent or empty, throw `ORPCError("INTERNAL_SERVER_ERROR", { message: "Brak konfiguracji serwera Discord" })`.
9. If membership is valid, update only the current user: `where(eq(user.id, context.session.user.id))` and set `verified: true`, `updatedAt: new Date()`.
10. Return `{ valid: true }` or `{ valid: false }`.

**Verify**: `pnpm check-types` → exit 0, or if tests are not yet updated, only expected route-client errors may remain before Step 2.

### Step 2: Update waiting room client flow

In `apps/web/src/pages/(auth)/waiting-room.tsx`:

1. Remove the `useQuery(orpc.user.getDiscordAccessToken.queryOptions())` call.
2. Run the verification effect once on mount, guarded by `isValidating` if needed.
3. Call `orpc.user.verifyDiscordGuildMembership.call()` directly.
4. If the result is valid, invalidate router and navigate to `/dashboard`.
5. Keep the existing Polish error toast, or update it to say the server could not verify Discord guild membership.

Do not expose or display access tokens in browser state.

**Verify**: `grep -R "getDiscordAccessToken\|verifySelf\|validateDiscordGuild" packages/api/src apps/web/src` → no matches, except no output.

### Step 3: Add focused tests

Create `packages/api/src/routers/user.test.ts` if test infrastructure from Plan 002 is available. Because the router currently imports DB directly, keep tests narrow by extracting a pure helper inside `user.ts`, for example:

```ts
export const hasDiscordGuild = (guilds: unknown, guildId: string): boolean => {
  const parsed = discordGuildSchema.safeParse(guilds);
  return parsed.success && parsed.data.some((guild) => guild.id === guildId);
};
```

Test:

- valid guild list containing target id returns true.
- valid guild list without target id returns false.
- invalid JSON shape returns false.
- empty guild id returns false or is rejected consistently with Step 1.

Do not mock DB unless the repo already has a safe mock pattern.

**Verify**: `pnpm test` → exit 0.

### Step 4: Run final verification

**Verify**:

- `pnpm check-types` → exit 0.
- `pnpm check` → exit 0.
- `pnpm test` → exit 0.

## Test plan

Add pure tests for Discord guild response parsing/membership selection. Manual reviewer should also test OAuth login with a Discord account in and out of the configured guild in a non-production environment.

## Done criteria

- [ ] No API route returns Discord access tokens to the browser.
- [ ] No client code submits an access token for verification.
- [ ] There is no standalone `verifySelf` endpoint.
- [ ] Successful Discord membership verification updates only the session user.
- [ ] `pnpm test`, `pnpm check-types`, and `pnpm check` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- Better Auth uses a provider ID other than `"discord"` in this repo's account rows and you cannot verify the correct value.
- The access token is not stored in `account.accessToken` for Discord OAuth.
- Implementing this requires changing Better Auth internals or schema.
- Plan 002 test tooling is not present.

## Maintenance notes

Future verification providers should follow the same pattern: browser asks the server to verify, server uses the session user's linked account, and the server performs the state change. Reviewers should scrutinize that no client-controlled credential or user ID can influence who is marked verified.

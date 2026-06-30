# Squad Builder Slice 9 Tech Spec

## Summary

Harden the complete squad-builder feature after Slices 1–8 by closing permission gaps, making cleanup paths reliable, and polishing failure/empty/loading states.

This slice is intentionally not a feature-expansion slice. It focuses on production readiness:

- server-side authorization checks across every read and mutation;
- reliable squad cleanup when account access is revoked;
- reliable squad cleanup when refetch removes or de-Jaruna-filters characters;
- clear empty, loading, retry, and partial-failure UI states;
- safe Firecrawl monthly budget exhaustion behavior;
- Firecrawl request ledger retention/review policy;
- clear Polish UI wording for permissions, sharing, imports, refetch, visibility, and filtering.

## Context / Current State

Relevant plan: `docs/squad-builder-plan.md`, Slice 9.

Existing/planned foundation:

- Slice 1 adds data model, profile parsing, Firecrawl budget ledger, and core persistence.
- Slice 2 adds owned account import/list flow and batch preview/save.
- Slice 3 adds account sharing invitations, accepted access, revocation, and shared accounts.
- Slice 4 adds owner-only refetch with diff confirmation and character cleanup.
- Slice 5 adds personal squad group creation/editing with placement validation.
- Slice 6 adds squad group editor invites and editor-limited saves.
- Slice 7 adds global visibility and read-only global viewer access.
- Slice 8 adds global/shared list filtering.

Current gap:

```txt
The feature can be functionally complete while still having edge-case risk:
crafted requests may target routes the UI hides,
cleanup may be inconsistently applied across revocation/refetch paths,
Firecrawl exhaustion may fail unclearly,
and empty/loading/error states may be inconsistent across the UI.
```

## Goals

- Verify every server route performs explicit authorization independent of UI state.
- Centralize and test cleanup behavior for removed account access and removed characters.
- Make account revocation remove affected characters from all impacted squad groups owned by the revoked user.
- Make refetch removal/de-Jaruna cleanup remove affected characters from all squads.
- Ensure batch import handles partial success/failure without losing valid previews.
- Ensure Firecrawl monthly budget exhaustion is detected before spending credits and reported clearly.
- Define a Firecrawl request ledger review/cleanup policy.
- Add consistent empty, loading, pending, retry, and disabled states to Accounts and Squads pages.
- Make permission and sharing wording clear for owners, accepted account users, squad editors, global viewers, and private groups.

## Non-Goals

- No new account import capabilities.
- No new squad builder rules.
- No new sharing roles beyond owner, accepted account user, accepted squad editor, and global viewer.
- No anonymous global/public access.
- No automatic scheduled Firecrawl refresh.
- No Firecrawl provider change.
- No large UI redesign outside polishing existing screens.
- No analytics dashboard for ledger usage beyond admin/developer review policy.

## Invariants

```ts
type SquadBuilderHardeningInvariant =
  | "UI-hidden controls are still rejected server-side"
  | "Only account owners can refetch Margonem accounts"
  | "Only account owners can send or revoke account access invites"
  | "Shared account users cannot refetch or reshare accounts"
  | "Only squad group owners can rename groups, manage squads, invite editors, change visibility, or delete groups"
  | "Accepted squad editors can only edit placements in existing squads"
  | "Global viewers can never mutate squad groups"
  | "Editor-added characters come only from accounts accessible to the squad group owner"
  | "Revoked account access removes affected characters from revoked user's squad groups"
  | "Removed or no-longer-Jaruna characters are removed from every squad placement"
  | "Cleanup operations are idempotent"
  | "Firecrawl budget is checked before queueing or executing profile fetches"
  | "Batch import partial failures preserve successful profile previews"
  | "Private data is never returned for client-side filtering or hiding";
```

## Design Constraints

- Prefer small, targeted hardening changes over refactors.
- Reuse existing domain parsers, service modules, and store adapter contracts where possible.
- Keep authorization in services/store queries, not only in React components.
- Keep cleanup in backend transactions so squad placements cannot be left half-cleaned.
- Keep expected failures typed and translated to ORPC errors at the router boundary.
- Do not spend Firecrawl credits during UI-only validation, list rendering, filtering, or squad editing.
- Do not log raw pasted URLs, raw profile HTML, or arbitrary user search text.
- UI copy should remain Polish and explicit about who can do what.

## Recommendation

Treat Slice 9 as a hardening pass with three implementation tracks:

1. **Authorization audit and tests** for all squad-builder endpoints.
2. **Cleanup consolidation** for account-access revocation and character removal.
3. **UX polish** for empty/loading/error states, partial failures, Firecrawl budget exhaustion, and wording.

Do not add broad new abstractions unless an existing cleanup or authorization rule is duplicated incorrectly in multiple services.

## Proposed Design

Add a small internal authorization matrix document/test fixture and use it to drive service/router integration tests.

Add or consolidate cleanup service functions:

```txt
removeCharactersFromSquads(characterIds)
removeAccountCharactersFromUserOwnedSquadGroups(accountId, affectedOwnerUserId)
```

Use these cleanup functions from:

- account access revoke flow;
- refetch apply-confirm flow when characters are removed or no longer Jaruna;
- account deletion flow, if deletion exists;
- future maintenance scripts, if needed.

Add UI state helpers/components only if they reduce duplication locally:

```txt
Accounts page
  -> empty owned accounts
  -> empty shared-with-me accounts
  -> empty invites
  -> import validating/fetching/previewing/saving states
  -> per-profile partial failure messages
  -> Firecrawl budget exhausted state

Squads page
  -> empty my groups
  -> empty shared groups
  -> empty global groups
  -> empty filtered results
  -> loading lists/detail
  -> forbidden/read-only messages
  -> pending squad invite red dot consistency
```

## Authorization Matrix

| Area         | Action                             | Allowed                                                       | Rejected                                                                        |
| ------------ | ---------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Accounts     | import account                     | logged-in actor if profile is eligible and budget allows      | unauthenticated, duplicate, already owned/shared, account owned by another user |
| Accounts     | refetch account                    | account owner                                                 | shared user, unrelated user                                                     |
| Accounts     | invite account user                | account owner                                                 | shared user, unrelated user                                                     |
| Accounts     | revoke account access              | account owner                                                 | shared user, unrelated user                                                     |
| Accounts     | accept/decline account invite      | invited user                                                  | owner acting as invitee, unrelated user                                         |
| Squad groups | create group                       | logged-in actor                                               | unauthenticated                                                                 |
| Squad groups | rename group                       | group owner                                                   | editor, global viewer, unrelated user                                           |
| Squad groups | add/remove squads                  | group owner                                                   | editor, global viewer, unrelated user                                           |
| Squad groups | edit placements in existing squads | owner, accepted editor                                        | global viewer, unrelated user                                                   |
| Squad groups | add characters                     | owner, accepted editor using owner-accessible characters only | viewer, unrelated user, characters from editor-only accounts                    |
| Squad groups | invite squad editor                | group owner                                                   | editor, global viewer, unrelated user                                           |
| Squad groups | accept/decline squad invite        | invited user                                                  | owner acting as invitee, unrelated user                                         |
| Squad groups | change visibility                  | group owner                                                   | editor, global viewer, unrelated user                                           |
| Squad groups | view private detail                | owner, accepted editor                                        | global viewer, unrelated user                                                   |
| Squad groups | view global detail                 | logged-in users                                               | unauthenticated                                                                 |
| Squad groups | delete group, if supported         | group owner                                                   | editor, global viewer, unrelated user                                           |
| Lists        | my groups                          | actor's owned groups only                                     | other users' private groups                                                     |
| Lists        | shared groups                      | accepted editor grants only                                   | pending/declined/revoked/unrelated groups                                       |
| Lists        | global groups                      | globally visible groups only                                  | private groups                                                                  |

## Cleanup Semantics

### Account access revoked

When an account owner revokes accepted access for `revokedUserId`:

```txt
transaction
  -> mark/revoke account access grant
  -> find all squad groups owned by revokedUserId
  -> remove placements using characters from the revoked account
  -> update affected squad group updatedAt timestamps
commit
```

Scope is intentionally limited to squad groups owned by the revoked user. If the revoked user is also an invited editor on another owner's group, that editor could not have added editor-only characters there because Slice 6 requires owner-accessible characters.

### Character removed on refetch

When owner confirms a refetch diff that removes characters or filters them out because they are no longer Jaruna:

```txt
transaction
  -> update changed characters in place
  -> insert added Jaruna characters
  -> delete removed/no-longer-Jaruna characters
  -> remove placements for deleted character ids from every squad
  -> update affected squad group updatedAt timestamps
commit
```

If the database uses foreign keys with cascade delete from character to placement, still keep explicit cleanup tests so product behavior is documented and timestamps can be updated.

### Cleanup idempotency

All cleanup services should be safe to run more than once:

- removing already-removed placements is a no-op;
- revoking already-revoked access returns the current revoked/not-found expected failure consistently;
- refetch apply should not duplicate characters or placements.

## Firecrawl Budget and Ledger Policy

### Budget exhaustion behavior

Before queueing or executing any profile fetch:

```txt
validate pasted profiles
  -> remove duplicates and import-ineligible profiles
  -> calculate required Firecrawl requests for eligible unique profile ids
  -> read current monthly ledger usage
  -> if remaining app budget < required requests, reject/partially block before fetch
```

UI should show:

```txt
"Limit odświeżeń profili został chwilowo wyczerpany. Spróbuj później albo skontaktuj się z administratorem."
```

If some profiles can be fetched within the remaining app budget and some cannot, prefer explicit partial handling:

- fetch only the profiles admitted by budget;
- mark the rest as not fetched because of budget limit;
- never start more Firecrawl requests than the app-level remaining budget.

### Ledger review/cleanup policy

Keep the ledger useful for budget enforcement and incident review:

- Store month, profile id, status, credits used, timestamp, and safe error tag.
- Keep successful and failed ledger rows for at least 13 months so year-over-year monthly usage can be reviewed.
- Monthly budget enforcement reads only the current month.
- Add a developer/admin maintenance note: rows older than 13 months may be archived or deleted after export if long-term audit is not needed.
- Do not store raw Firecrawl HTML in the ledger.
- Do not expose the ledger to normal users.

## UI Polish Notes

### Accounts page empty states

```txt
Owned accounts empty:
"Nie dodałeś jeszcze żadnego konta Margonem. Wklej linki do profili, aby zaimportować postacie z Jaruny."

Shared accounts empty:
"Nikt nie udostępnił Ci jeszcze konta."

Invites empty:
"Nie masz oczekujących zaproszeń do kont."
```

### Batch import partial failure states

Per pasted URL row should distinguish:

- duplicate in pasted batch;
- account already owned by current user;
- account already exists under another owner;
- account already shared with current user;
- invalid profile URL;
- Firecrawl budget exhausted;
- Firecrawl fetch failed;
- parser found no Jaruna characters.

Successful previews must remain confirmable even when other rows failed.

### Squads page empty states

```txt
My groups empty:
"Nie masz jeszcze żadnych grup składów. Utwórz pierwszą grupę, aby zaplanować postacie."

Shared groups empty:
"Nie masz jeszcze udostępnionych grup składów."

Global groups empty:
"Nie ma jeszcze publicznych składów."

Filtered results empty:
"Brak składów pasujących do filtrów."
```

### Permission wording

```txt
Owner controls helper:
"Tylko właściciel może zmieniać nazwę, widoczność, zaproszenia i strukturę składów."

Editor helper:
"Możesz dodawać i usuwać postacie w istniejących składach. Nie możesz zmieniać ustawień grupy."

Viewer helper:
"To widok tylko do odczytu. Edytować mogą właściciel i zaproszeni edytorzy."
```

### Loading and disabled states

- Disable save/apply buttons while the corresponding mutation is in flight.
- Show list-level skeletons or loading text for initial loads.
- Preserve previous list results during filter refetches if the query library supports it.
- Use retry buttons for recoverable list/detail failures.
- Never show a destructive cleanup as complete before the mutation succeeds.

## Files to Add / Change / Delete

### Add

```txt
packages/api/src/modules/squad-builder/squad-builder-authorization-matrix.test.ts
```

Integration/service tests covering the authorization matrix.

```txt
packages/api/src/modules/squad-builder/squad-cleanup.test.ts
```

Focused tests for revocation/refetch cleanup idempotency.

Optional if cleanup is not already centralized:

```txt
packages/api/src/modules/squad-builder/squad-cleanup.ts
```

Shared cleanup helpers/services.

Optional docs/admin note:

```txt
docs/firecrawl-ledger-policy.md
```

Only add if the policy does not fit naturally near existing Firecrawl implementation docs.

### Change

```txt
packages/api/src/modules/squad-builder/*
```

Audit all services for explicit owner/editor/viewer/account-access authorization.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Ensure cleanup queries are transactional, idempotent, and update affected squad group timestamps.

```txt
packages/api/src/routers/squad-builder.ts
```

Ensure all expected authorization, validation, budget, and persistence failures map to clear ORPC errors.

```txt
apps/web/src/pages/dashboard/squad-builder/accounts.tsx
```

Add empty/loading/error/partial-failure/budget-exhausted states and clearer wording.

```txt
apps/web/src/pages/dashboard/squad-builder/squads.tsx
apps/web/src/pages/dashboard/squad-builder/squad-editor.tsx
```

Add empty/loading/error/read-only/permission wording polish.

```txt
apps/web/src/components/sidebar.tsx
```

Verify the pending squad group invite red dot only reflects pending squad group invites and updates after accept/decline.

### Delete

None by default. Remove only duplicated local cleanup code after a shared cleanup helper is introduced.

## RGR TDD Test Plan

### 1. Authorization matrix rejects crafted requests

RED:

```ts
it("rejects non-owners from owner-only squad group mutations", async () => {});
it("rejects global viewers from all squad group mutations", async () => {});
it("rejects shared account users from owner-only account mutations", async () => {});
```

GREEN: add missing service/store checks and router error mappings.

### 2. Editors can only edit placements

RED:

```ts
it("lets an accepted editor edit existing squad placements", async () => {});
it("rejects an accepted editor from renaming groups or changing visibility", async () => {});
```

GREEN: preserve Slice 6 editor path while hardening owner-only paths.

### 3. Editors cannot use their own extra account characters

RED:

```ts
it("rejects editor placement changes using characters not accessible to the squad group owner", async () => {});
```

GREEN: ensure save validation resolves character access from the group owner's accessible accounts.

### 4. Revoking account access cleans revoked user's squads

RED:

```ts
it("removes revoked account characters from squad groups owned by the revoked user", async () => {});
```

GREEN: run revocation and placement cleanup in one transaction.

### 5. Revocation cleanup is idempotent

RED:

```ts
it("can run account access revocation cleanup more than once without changing valid placements", async () => {});
```

GREEN: make delete queries no-op safely when placements are already gone.

### 6. Refetch removal cleans all squad placements

RED:

```ts
it("removes deleted or no-longer-Jaruna characters from every affected squad after confirmed refetch", async () => {});
```

GREEN: use shared character placement cleanup from refetch apply flow.

### 7. Refetch level/name changes keep placements

RED:

```ts
it("keeps existing placements when refetch only changes character display fields", async () => {});
```

GREEN: update changed character rows in place.

### 8. Batch import preserves partial successes

RED:

```ts
it("returns successful profile previews alongside per-profile import failures", async () => {});
```

GREEN: represent batch results as successes plus failures instead of all-or-nothing failure.

### 9. Firecrawl budget exhaustion spends zero extra credits

RED:

```ts
it("rejects or limits import fetches before Firecrawl is called when the monthly app budget is exhausted", async () => {});
```

GREEN: check budget before invoking the Firecrawl client and assert no client calls.

### 10. Firecrawl ledger stores safe fields only

RED:

```ts
it("records Firecrawl request ledger rows without raw profile HTML or pasted URLs", async () => {});
```

GREEN: persist only month/profile/status/credits/timestamp/safe error tag.

### 11. Lists never leak unauthorized rows under filters

RED:

```ts
it("does not return private or unauthorized squad groups from filtered global/shared/my lists", async () => {});
```

GREEN: keep authorization predicates in SQL queries before projection.

### 12. Frontend shows empty/loading/error states

RED:

```ts
it("shows clear empty states for accounts and squad group lists", async () => {});
it("shows per-profile batch import errors while keeping valid previews", async () => {});
it("shows read-only wording for global viewers", async () => {});
```

If no frontend test harness exists, document the UI automation gap and rely on API integration tests plus manual QA checklist.

## Manual QA Checklist

- Import a batch with one valid profile, one duplicate, one invalid URL, and one already-owned account; valid preview remains saveable.
- Exhaust the test Firecrawl app budget; import/refetch fails before client call with clear wording.
- Shared account user cannot refetch or share the account.
- Revoking shared account access removes that account's characters from the revoked user's groups.
- Refetch that removes a Jaruna character removes it from all squads.
- Refetch that changes level/name/avatar keeps the character placed.
- Owner can rename/change visibility/invite editors; editor cannot.
- Global viewer can open global detail read-only and cannot save via crafted request.
- Shared/global/my filtered lists do not show unauthorized private groups.
- Pending squad invite red dot appears for pending squad group invites and clears after accept/decline.

## Risks and Open Questions

1. **Cleanup timestamp policy.** This spec recommends updating affected squad group `updatedAt` when placements are removed by revocation/refetch cleanup. If the product wants cleanup to be invisible in sorting, document that exception explicitly.
2. **Partial budget handling.** If implementation chooses all-or-nothing budget rejection instead of partial admission, the UI must clearly say none were fetched and no Firecrawl calls were made.
3. **Ledger retention may need admin tooling later.** Slice 9 defines policy only; a full admin UI is out of scope.
4. **Authorization tests may expose earlier slice gaps.** Fix gaps minimally rather than redesigning the permission model.
5. **Frontend test coverage may be limited.** If no UI harness exists, keep API tests exhaustive and add a manual QA checklist to the implementation notes.

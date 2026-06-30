# Squad Builder Slice 3 Tech Spec

## Summary

Build account sharing invites so Margonem account owners can share accepted access with other verified users.

This slice adds:

- Username search for share targets.
- Owner-created account access invitations.
- Account invite inbox on the Accounts page.
- Invite accept/decline actions.
- Owner revoke accepted or pending access.
- Shared-with-me accounts list.
- Owner-only refetch authorization contract for later Slice 4.
- Cleanup of affected squads when accepted access is revoked.

The core rule is: sharing grants another app user access to use the owner's Jaruna characters in the recipient's own squad groups. It does not transfer ownership and does not allow the recipient to refetch the account.

## Context / Current State

Relevant product plan: `docs/squad-builder-plan.md`, Slice 3.

Existing backend foundation from Slice 1 and planned Slice 2:

- `margonem_accounts` stores one owner per Margonem profile id.
- `margonem_characters` stores Jaruna characters for an account.
- `margonem_account_access` already exists as the account sharing/access table:

```ts
export const margonemAccountAccess = pgTable("margonem_account_access", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .references(() => margonemAccount.id, {
      onDelete: "cascade",
    })
    .notNull(),
  userId: text("user_id")
    .references(() => user.id, {
      onDelete: "cascade",
    })
    .notNull(),
  invitedByUserId: text("invited_by_user_id")
    .references(() => user.id, {
      onDelete: "cascade",
    })
    .notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- Unique index exists on `(accountId, userId)`.
- `squad_groups`, `squads`, and `squad_characters` schema exists.
- Slice 2 spec adds Accounts page and owned accounts list.
- Existing `userRouter.getVerified` and `userRouter.list` expose broad user lists, but Slice 3 needs a narrower search seam for invite targets.

Current gap:

```txt
Owners cannot invite users to use accounts.
Users cannot accept/decline account access.
The Accounts page has no shared-with-me list or invite management.
Revoking access does not yet clean up affected squads.
```

## Goals

- Let an account owner search verified users by username.
- Let an account owner send one invite per account/user pair.
- Let invited users accept or decline invites.
- Let owners revoke pending or accepted access.
- Show incoming account invites on the Accounts page.
- Show shared-with-me accounts on the Accounts page.
- Ensure shared users cannot refetch accounts.
- Remove revoked account characters from the revoked user's squad groups.
- Preserve the account owner as the only owner and only refetch-capable actor.

## Non-Goals

- No invite expiration.
- No invite notifications outside the Accounts page.
- No squad group sharing invites; that is Slice 6.
- No refetch UI or diff confirmation; that is Slice 4.
- No global squad visibility changes.
- No account ownership transfer.
- No accepting invites on behalf of another user.

## Invariants

```ts
type AccountSharingInvariant =
  | "Only the Margonem account owner can invite users to that account"
  | "Only the Margonem account owner can revoke access to that account"
  | "An owner cannot invite themself to their own account"
  | "Only verified users can be invite targets"
  | "A user can have at most one access row per account"
  | "Only the invited user can accept or decline their invite"
  | "Accepted account access grants character usage, not ownership"
  | "Shared users cannot refetch the account"
  | "Revoked access removes that account's characters from the revoked user's squad groups"
  | "Declined access does not grant character usage";
```

## Design Constraints

- Use the existing `margonem_account_access` table and unique `(accountId, userId)` constraint.
- Keep account sharing as a Service Module concern, not router inline SQL.
- Service modules receive parsed `AppUserId`, `MargonemAccountId`, and typed invite/access ids.
- Persistence adapter owns Drizzle rows and cleanup SQL.
- Expected failures are typed values in service contracts and translated to ORPC errors at the router.
- UI lives in the existing Accounts page from Slice 2.
- Polish copy should be direct and compact.

## Alternatives Considered

### Option 1: Treat `margonem_account_access` as current-state only

Use one row per account/user and overwrite status freely: `pending -> accepted -> revoked -> pending`.

```txt
send invite -> upsert status='pending'
accept -> status='accepted'
decline -> status='declined'
revoke -> status='revoked'
resend -> status='pending'
```

Pros:

- Reuses existing table exactly.
- Simple unique constraint.
- Easy to query accepted access.

Cons:

- Loses historical event detail.
- Resending after decline/revoke needs careful transition rules.

### Option 2: Separate invite events and accepted access tables

Add `margonem_account_access_invites` for invite lifecycle and keep `margonem_account_access` only for accepted access.

Pros:

- Cleaner audit/event model.
- Accepted access query has no status filtering.

Cons:

- More schema and sync logic for no current product requirement.
- Revocation must update/delete two concepts.
- Existing schema already anticipated status-based invites.

### Option 3: Account-level ACL with no invite state

Owner directly grants/removes access. No accept/decline flow.

Pros:

- Smallest implementation.

Cons:

- Violates plan requirement: invited users accept or decline.
- Users may get accounts they did not consent to see/use.

## Recommendation

Use **Option 1: status-based access rows**.

It matches the existing schema and product requirements with minimal added persistence. The service layer will model legal transitions explicitly so the table does not become a loose nullable state bag.

## Proposed Design

Add account sharing capabilities under `squadBuilder`:

```ts
squadBuilder.searchAccountInviteTargets(input);
squadBuilder.sendAccountAccessInvite(input);
squadBuilder.listIncomingAccountInvites();
squadBuilder.respondToAccountAccessInvite(input);
squadBuilder.revokeAccountAccess(input);
squadBuilder.listSharedAccounts();
squadBuilder.listAccountAccessGrants(input);
```

The Accounts page gets three sections:

```txt
Konta Margonem
  - Batch import / owned accounts from Slice 2
  - Udostępnione mi
  - Zaproszenia do kont
  - Sharing management inside each owned account row/details panel
```

Do not add account sharing to a modal-first workflow. Prefer inline disclosure on each owned account row: “Udostępnij” opens a compact panel with search, pending invites, and accepted users.

## Domain Model and Types

### Branded ids

```ts
export type MargonemAccountId = number & {
  readonly __brand: "MargonemAccountId";
};

export type MargonemAccountAccessId = number & {
  readonly __brand: "MargonemAccountAccessId";
};

export type InvalidMargonemAccountId = {
  readonly _tag: "InvalidMargonemAccountId";
};

export type InvalidMargonemAccountAccessId = {
  readonly _tag: "InvalidMargonemAccountAccessId";
};

export const parseMargonemAccountId = (
  input: number
): Result<MargonemAccountId, InvalidMargonemAccountId>;

export const parseMargonemAccountAccessId = (
  input: number
): Result<MargonemAccountAccessId, InvalidMargonemAccountAccessId>;
```

### Access lifecycle

```ts
export type AccountAccessStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked";

export type PendingAccountAccess = {
  readonly _tag: "PendingAccountAccess";
  readonly id: MargonemAccountAccessId;
  readonly accountId: MargonemAccountId;
  readonly invitedUserId: AppUserId;
  readonly invitedByUserId: AppUserId;
};

export type AcceptedAccountAccess = {
  readonly _tag: "AcceptedAccountAccess";
  readonly id: MargonemAccountAccessId;
  readonly accountId: MargonemAccountId;
  readonly sharedUserId: AppUserId;
  readonly invitedByUserId: AppUserId;
};

export type AccountAccessGrant = PendingAccountAccess | AcceptedAccountAccess;
```

Legal transitions:

```ts
export type AccountAccessTransition =
  | {
      readonly from: "pending";
      readonly to: "accepted";
      readonly actor: "invitedUser";
    }
  | {
      readonly from: "pending";
      readonly to: "declined";
      readonly actor: "invitedUser";
    }
  | {
      readonly from: "pending" | "accepted";
      readonly to: "revoked";
      readonly actor: "accountOwner";
    }
  | {
      readonly from: "declined" | "revoked";
      readonly to: "pending";
      readonly actor: "accountOwner";
    };
```

### User search result

```ts
export type AccountInviteTarget = {
  readonly userId: AppUserId;
  readonly name: string;
  readonly image: string | null;
};

export type SearchAccountInviteTargetsInput = {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly query: string;
};

export type InvalidAccountInviteTargetQuery = {
  readonly _tag: "InvalidAccountInviteTargetQuery";
  readonly message: string;
};
```

Search rules:

```ts
const accountInviteTargetSearchPolicy = {
  minQueryLength: 2,
  maxQueryLength: 40,
  maxResults: 10,
} as const;
```

## Types, Interfaces, and APIs

### Protocol DTOs

```ts
export type SearchAccountInviteTargetsDto = {
  readonly accountId: number;
  readonly query: string;
};

export type SearchAccountInviteTargetsResponseDto = {
  readonly users: readonly {
    readonly userId: string;
    readonly name: string;
    readonly image: string | null;
  }[];
};

export type SendAccountAccessInviteDto = {
  readonly accountId: number;
  readonly invitedUserId: string;
};

export type AccountAccessInviteDto = {
  readonly accessId: number;
  readonly accountId: number;
  readonly accountDisplayName: string;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly generatedProfileUrl: string;
  readonly status: AccountAccessStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type RespondToAccountAccessInviteDto = {
  readonly accessId: number;
  readonly response: "accept" | "decline";
};

export type RevokeAccountAccessDto = {
  readonly accessId: number;
};

export type SharedMargonemAccountDto = {
  readonly accountId: number;
  readonly profileId: number;
  readonly displayName: string;
  readonly generatedProfileUrl: string;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly lastFetchedAt: string;
  readonly characterCount: number;
};

export type AccountAccessGrantDto = {
  readonly accessId: number;
  readonly userId: string;
  readonly userName: string;
  readonly userImage: string | null;
  readonly status: Extract<AccountAccessStatus, "pending" | "accepted">;
  readonly createdAt: string;
  readonly updatedAt: string;
};
```

### Expected failures

```ts
export type AccountSharingAuthorizationError =
  | { readonly _tag: "MargonemAccountNotFound" }
  | { readonly _tag: "ActorDoesNotOwnMargonemAccount" }
  | { readonly _tag: "CannotInviteSelf" }
  | { readonly _tag: "InviteTargetNotFound" }
  | { readonly _tag: "InviteTargetNotVerified" }
  | { readonly _tag: "AccountAccessInviteNotFound" }
  | { readonly _tag: "ActorIsNotInviteRecipient" }
  | { readonly _tag: "AccountAccessTransitionNotAllowed" };

export type AccountSharingError =
  | AccountSharingAuthorizationError
  | InvalidMargonemAccountId
  | InvalidMargonemAccountAccessId
  | InvalidAppUserId
  | InvalidAccountInviteTargetQuery
  | SquadBuilderPersistenceUnavailable;
```

### Service interfaces

```ts
export interface AccountSharingStore {
  readonly searchInviteTargets: (
    input: SearchInviteTargetsStoreInput
  ) => Promise<
    Result<readonly AccountInviteTarget[], SquadBuilderPersistenceUnavailable>
  >;

  readonly findOwnedAccountForSharing: (
    input: FindOwnedAccountForSharingInput
  ) => Promise<
    Result<
      OwnedAccountForSharing,
      MargonemAccountNotFound | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly findVerifiedInviteTarget: (
    input: FindVerifiedInviteTargetInput
  ) => Promise<
    Result<
      VerifiedInviteTarget,
      | InviteTargetNotFound
      | InviteTargetNotVerified
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly upsertAccountAccessInvite: (
    input: UpsertAccountAccessInviteInput
  ) => Promise<
    Result<
      AccountAccessInviteSummary,
      AccountAccessTransitionNotAllowed | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listIncomingAccountInvites: (
    input: ListIncomingAccountInvitesInput
  ) => Promise<
    Result<
      readonly AccountAccessInviteSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;

  readonly respondToAccountAccessInvite: (
    input: RespondToAccountAccessInviteStoreInput
  ) => Promise<
    Result<
      AccountAccessInviteSummary,
      | AccountAccessInviteNotFound
      | AccountAccessTransitionNotAllowed
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly revokeAccountAccess: (
    input: RevokeAccountAccessStoreInput
  ) => Promise<
    Result<
      RevokeAccountAccessResult,
      | AccountAccessInviteNotFound
      | AccountAccessTransitionNotAllowed
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listSharedAccounts: (
    input: ListSharedAccountsInput
  ) => Promise<
    Result<
      readonly SharedMargonemAccountSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listAccountAccessGrants: (
    input: ListAccountAccessGrantsInput
  ) => Promise<
    Result<
      readonly AccountAccessGrantSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;
}
```

Store DTOs:

```ts
export type FindOwnedAccountForSharingInput = {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
};

export type OwnedAccountForSharing = {
  readonly accountId: MargonemAccountId;
  readonly ownerUserId: AppUserId;
  readonly displayName: AccountDisplayName;
};

export type FindVerifiedInviteTargetInput = {
  readonly targetUserId: AppUserId;
};

export type VerifiedInviteTarget = {
  readonly userId: AppUserId;
  readonly name: string;
  readonly image: string | null;
};

export type UpsertAccountAccessInviteInput = {
  readonly accountId: MargonemAccountId;
  readonly ownerUserId: AppUserId;
  readonly invitedUserId: AppUserId;
  readonly now: Date;
};

export type RespondToAccountAccessInviteStoreInput = {
  readonly accessId: MargonemAccountAccessId;
  readonly invitedUserId: AppUserId;
  readonly response: "accept" | "decline";
  readonly now: Date;
};

export type RevokeAccountAccessStoreInput = {
  readonly accessId: MargonemAccountAccessId;
  readonly ownerUserId: AppUserId;
  readonly now: Date;
};

export type RevokeAccountAccessResult = {
  readonly accessId: MargonemAccountAccessId;
  readonly accountId: MargonemAccountId;
  readonly revokedUserId: AppUserId;
  readonly removedSquadCharacterCount: number;
};
```

### Service modules

```ts
export class SearchAccountInviteTargets {
  constructor(private readonly store: AccountSharingStore) {}

  /** Search verified users the account owner may invite. */
  search(
    input: SearchAccountInviteTargetsInput
  ): Promise<Result<readonly AccountInviteTarget[], AccountSharingError>>;
}

export class SendAccountAccessInvite {
  constructor(
    private readonly store: AccountSharingStore,
    private readonly clock: Clock
  ) {}

  /** Send or re-send an account access invitation. */
  send(input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
    readonly invitedUserId: AppUserId;
  }): Promise<Result<AccountAccessInviteSummary, AccountSharingError>>;
}

export class RespondToAccountAccessInvite {
  constructor(
    private readonly store: AccountSharingStore,
    private readonly clock: Clock
  ) {}

  /** Accept or decline an account access invite as the invited user. */
  respond(input: {
    readonly actorUserId: AppUserId;
    readonly accessId: MargonemAccountAccessId;
    readonly response: "accept" | "decline";
  }): Promise<Result<AccountAccessInviteSummary, AccountSharingError>>;
}

export class RevokeAccountAccess {
  constructor(
    private readonly store: AccountSharingStore,
    private readonly clock: Clock
  ) {}

  /** Revoke pending or accepted account access as the account owner. */
  revoke(input: {
    readonly actorUserId: AppUserId;
    readonly accessId: MargonemAccountAccessId;
  }): Promise<Result<RevokeAccountAccessResult, AccountSharingError>>;
}

export class ListAccountSharingState {
  constructor(private readonly store: AccountSharingStore) {}

  listIncomingInvites(input: {
    readonly actorUserId: AppUserId;
  }): Promise<
    Result<readonly AccountAccessInviteSummary[], AccountSharingError>
  >;

  listSharedAccounts(input: {
    readonly actorUserId: AppUserId;
  }): Promise<
    Result<readonly SharedMargonemAccountSummary[], AccountSharingError>
  >;

  listAccountAccessGrants(input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }): Promise<
    Result<readonly AccountAccessGrantSummary[], AccountSharingError>
  >;
}
```

### Owner-only refetch authorization contract

Slice 4 refetch service should use this capability rather than checking ownership inline:

```ts
export interface MargonemAccountOwnerAuthorizer {
  readonly authorizeOwner: (input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }) => Promise<
    Result<
      OwnedAccountForSharing,
      | MargonemAccountNotFound
      | ActorDoesNotOwnMargonemAccount
      | SquadBuilderPersistenceUnavailable
    >
  >;
}
```

Shared accepted users are intentionally not authorized by this interface.

## Seams, Boundaries, Adapters, and Implementations

### Domain modules

```txt
packages/api/src/modules/squad-builder/margonem-account-id.ts
packages/api/src/modules/squad-builder/margonem-account-access-id.ts
packages/api/src/modules/squad-builder/account-access-status.ts
```

Own id parsing and access status parsing/transition helpers.

### Service modules

```txt
packages/api/src/modules/squad-builder/search-account-invite-targets.ts
packages/api/src/modules/squad-builder/send-account-access-invite.ts
packages/api/src/modules/squad-builder/respond-to-account-access-invite.ts
packages/api/src/modules/squad-builder/revoke-account-access.ts
packages/api/src/modules/squad-builder/list-account-sharing-state.ts
```

Own authorization and lifecycle policy.

### Persistence adapter

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Extend the existing Drizzle adapter. It already owns squad-builder persistence and should remain the single cohesive External Adapter Module for these tables.

### Router boundary

```txt
packages/api/src/routers/squad-builder.ts
```

Owns Zod DTO parsing, session parsing, service composition, protocol projections, ORPC error translation, and safe logs.

### Frontend route/page

```txt
apps/web/src/pages/dashboard/squad-builder/accounts.tsx
```

Extend the existing Slice 2 Accounts page with invite inbox, shared-with-me list, and owner sharing management.

## Call Stacks and Data Flow

### Current / Old Flow

```txt
Accounts page
  -> owned account import/list only
  -> no account invite search
  -> no account access rows created through UI
  -> no shared account list
  -> no revocation cleanup
```

### Proposed / New Flow: Search Invite Targets

```txt
search input text + accountId
  -> ORPC DTO { accountId: number, query: string }
  -> zod DTO parser
  -> parseAppUserId(session.user.id)
  -> parseMargonemAccountId(accountId)
  -> SearchAccountInviteTargets.search
  -> parse/search query policy
  -> store.findOwnedAccountForSharing({ actorUserId, accountId })
  -> reject if actor is not owner
  -> store.searchInviteTargets({ accountId, query, exclude actor and existing accepted/pending users })
  -> readonly AccountInviteTarget[]
  -> protocol DTO
  -> inline search results
```

### Proposed / New Flow: Send Invite

```txt
owner clicks invite target
  -> ORPC DTO { accountId: number, invitedUserId: string }
  -> zod DTO parser
  -> parse actor AppUserId
  -> parse target AppUserId
  -> parse MargonemAccountId
  -> SendAccountAccessInvite.send
  -> store.findOwnedAccountForSharing
  -> reject self-invite
  -> store.findVerifiedInviteTarget
  -> store.upsertAccountAccessInvite
       if no row: insert pending
       if declined/revoked: update to pending
       if pending/accepted: return transition-not-allowed or existing semantic failure
  -> AccountAccessInviteSummary
  -> protocol DTO
  -> invalidate access grants query
```

### Proposed / New Flow: Accept/Decline Invite

```txt
incoming invite action
  -> ORPC DTO { accessId: number, response: 'accept' | 'decline' }
  -> zod parser
  -> parse actor AppUserId
  -> parse MargonemAccountAccessId
  -> RespondToAccountAccessInvite.respond
  -> store.respondToAccountAccessInvite({ accessId, invitedUserId: actorUserId, response })
       guarded update where id = accessId and userId = actorUserId and status = 'pending'
  -> AccountAccessInviteSummary
  -> protocol DTO
  -> invalidate incoming invites and shared accounts queries
```

### Proposed / New Flow: Revoke Access

```txt
owner clicks revoke on pending/accepted grant
  -> ORPC DTO { accessId: number }
  -> zod parser
  -> parse actor AppUserId
  -> parse MargonemAccountAccessId
  -> RevokeAccountAccess.revoke
  -> store.revokeAccountAccess({ accessId, ownerUserId: actorUserId, now })
       transaction:
         load access + account where account.ownerUserId = actorUserId
         guard status in ('pending', 'accepted')
         update status = 'revoked'
         if previous status was accepted:
           delete squad_characters where:
             squad belongs to a squad_group owned by revoked user
             character belongs to revoked account
         return removed count
  -> protocol DTO
  -> invalidate account grants query
```

### Proposed / New Flow: Shared-With-Me List

```txt
Accounts page mounts
  -> useQuery(orpc.squadBuilder.listSharedAccounts.queryOptions())
  -> verified router
  -> parse actor AppUserId
  -> ListAccountSharingState.listSharedAccounts
  -> store.listSharedAccounts({ actorUserId })
       join margonem_account_access accepted rows
       join margonem_accounts, owner user, count characters
  -> protocol DTO
  -> UI shared accounts list
```

### Failure Flow

```txt
actor does not own account
  -> ActorDoesNotOwnMargonemAccount
  -> ORPC FORBIDDEN

account not found
  -> MargonemAccountNotFound
  -> ORPC NOT_FOUND

self invite
  -> CannotInviteSelf
  -> ORPC BAD_REQUEST

target not found or not verified
  -> InviteTargetNotFound | InviteTargetNotVerified
  -> ORPC NOT_FOUND or BAD_REQUEST

invite already pending or accepted
  -> AccountAccessTransitionNotAllowed
  -> ORPC CONFLICT

non-recipient responds to invite
  -> ActorIsNotInviteRecipient or AccountAccessInviteNotFound
  -> ORPC FORBIDDEN or NOT_FOUND

owner revokes already declined/revoked invite
  -> AccountAccessTransitionNotAllowed
  -> ORPC CONFLICT

persistence failure during revoke cleanup
  -> SquadBuilderPersistenceUnavailable
  -> ORPC INTERNAL_SERVER_ERROR
```

### Retry / Cancellation / Idempotency Flow

- Send invite is retry-safe for `declined`/`revoked -> pending` because it updates the existing `(accountId, userId)` row.
- Sending while `pending` or `accepted` returns a typed conflict; the UI should refresh grants.
- Accept/decline uses guarded update from `pending` only.
- Revoke uses a transaction so status update and squad cleanup commit together.
- Revoke cleanup is idempotent after success: a repeated revoke sees `revoked` and returns conflict without deleting additional rows.
- No network calls or Firecrawl calls occur in Slice 3 operations.
- Search is read-only and can accept cancellation if ORPC exposes request signals; DB operations are not meaningfully cancellable in the current Drizzle setup.

### Observability Flow

Safe fields:

```ts
type AccountSharingLogFields = {
  readonly operation:
    | "searchAccountInviteTargets"
    | "sendAccountAccessInvite"
    | "respondToAccountAccessInvite"
    | "revokeAccountAccess"
    | "listIncomingAccountInvites"
    | "listSharedAccounts"
    | "listAccountAccessGrants";
  readonly actorUserId?: string;
  readonly accountId?: number;
  readonly accessId?: number;
  readonly targetUserId?: string;
  readonly errorTag?: string;
  readonly removedSquadCharacterCount?: number;
};
```

Log dependency/persistence failures and revocation cleanup summaries. Do not log search query text unless explicitly classified as safe later.

## Files to Add / Change / Delete

### Add

```txt
packages/api/src/modules/squad-builder/margonem-account-id.ts
packages/api/src/modules/squad-builder/margonem-account-access-id.ts
packages/api/src/modules/squad-builder/account-access-status.ts
```

Domain parsers and lifecycle helpers.

```txt
packages/api/src/modules/squad-builder/search-account-invite-targets.ts
packages/api/src/modules/squad-builder/send-account-access-invite.ts
packages/api/src/modules/squad-builder/respond-to-account-access-invite.ts
packages/api/src/modules/squad-builder/revoke-account-access.ts
packages/api/src/modules/squad-builder/list-account-sharing-state.ts
```

Service modules.

```txt
packages/api/src/modules/squad-builder/account-sharing.test.ts
```

Focused service behavior tests with object/factory recording fakes.

### Change

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Implement account sharing store methods, user search, status transitions, shared account list, grant list, and revoke cleanup transaction.

```txt
packages/api/src/routers/squad-builder.ts
```

Add ORPC endpoints, protocol projections, and error translation.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.integration.test.ts
```

Add real Postgres tests for invite lifecycle and revoke cleanup.

```txt
apps/web/src/pages/dashboard/squad-builder/accounts.tsx
```

Add invite inbox, shared-with-me list, and owner sharing management UI.

```txt
apps/web/src/components/sidebar/app-sidebar.tsx
```

No new navigation required if Slice 2 already added Accounts. If not, ensure the Accounts route is reachable.

### Delete

None.

## RGR TDD Test Plan

### 1. Parse account ids and access ids

RED:

```ts
it("accepts positive integer account and access ids", () => {});
it("rejects non-positive or non-integer account and access ids", () => {});
```

GREEN: implement id domain modules.

### 2. Search rejects invalid query before store search

RED:

```ts
it("rejects account invite target searches shorter than two characters", async () => {});
```

GREEN: implement query parser/policy in `SearchAccountInviteTargets`.

### 3. Search requires account ownership

RED:

```ts
it("does not search users when the actor does not own the account", async () => {});
```

GREEN: service calls `findOwnedAccountForSharing` first.

### 4. Owner cannot invite themself

RED:

```ts
it("rejects self-invites before writing an access row", async () => {});
```

GREEN: implement self-invite guard.

### 5. Owner can send invite to verified user

RED:

```ts
it("creates a pending account access invite for a verified target user", async () => {});
```

GREEN: implement send service and store seam call.

### 6. Re-send after declined/revoked returns to pending

RED:

```ts
it("allows the owner to send a new pending invite after decline or revoke", async () => {});
```

GREEN: implement transition helper and upsert behavior.

### 7. Invited user can accept invite

RED:

```ts
it("lets the invited user accept a pending account access invite", async () => {});
```

GREEN: implement respond service and guarded update.

### 8. Invited user can decline invite

RED:

```ts
it("lets the invited user decline a pending account access invite", async () => {});
```

GREEN: add decline transition.

### 9. Non-recipient cannot respond

RED:

```ts
it("rejects accepting an invite as a different user", async () => {});
```

GREEN: store query/update includes `userId = actorUserId`.

### 10. Owner can revoke accepted access and cleanup affected squads

RED:

```ts
it("revokes accepted account access and removes that account's characters from the revoked user's squad groups", async () => {});
```

Use real Postgres integration because this proves join/delete semantics.

GREEN: implement revoke transaction cleanup.

### 11. Revoking pending invite does not cleanup squads

RED:

```ts
it("revokes a pending invite without deleting squad characters", async () => {});
```

GREEN: cleanup only for prior `accepted` state.

### 12. Shared-with-me list includes only accepted access

RED:

```ts
it("lists only accepted shared accounts for the actor", async () => {});
```

GREEN: implement list query and projection.

### 13. Account grants list is owner-only

RED:

```ts
it("lists pending and accepted grants for an owned account", async () => {});
it("rejects listing grants for an account owned by another user", async () => {});
```

GREEN: implement grants list service/store.

### 14. Router integration maps account sharing failures to ORPC errors

RED:

```ts
it("returns conflict when sending an invite that is already pending", async () => {});
it("returns forbidden when revoking access for an account the actor does not own", async () => {});
```

GREEN: add router endpoints and error translation.

### 15. Accounts page shows invite inbox and shared accounts

RED:

```ts
it("renders incoming account invites, supports accept/decline, and shows accepted accounts under shared with me", async () => {});
```

If no frontend test harness exists, document the UI coverage gap and rely on API integration plus type checks for this slice.

## Risks and Open Questions

1. **Build order interaction with Slice 5.** The recommended plan builds Slice 5 before Slice 3, so revoke cleanup can be tested against real squad rows. If Slice 3 is built before Slice 5, keep the cleanup method present but its integration test should be added when squad editing exists.
2. **Search privacy.** This spec searches verified users by display name and excludes self plus existing pending/accepted users. It does not hide declined/revoked users from search because re-invite is allowed.
3. **Invite conflict wording.** Product copy should distinguish “zaproszenie już wysłane” from “użytkownik ma już dostęp”. The backend can use one `AccountAccessTransitionNotAllowed` tag with status in safe context if needed.
4. **Audit history.** Status rows do not retain a full event history. Add an audit table only if product later needs moderation/debug history.
5. **Refetch authorization.** Slice 3 defines the owner-only authorization seam for Slice 4 but does not build refetch behavior.

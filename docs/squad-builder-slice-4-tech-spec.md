# Squad Builder Slice 4 Tech Spec

## Summary

Build manual Margonem account refetch with diff confirmation.

This slice lets an account owner refresh a saved Margonem account through the existing Firecrawl-backed profile fetcher, review a diff, then apply the confirmed changes transactionally:

- Owner-only refetch button on the Accounts page.
- Firecrawl-backed latest Jaruna character preview after budget validation.
- Persisted pending refetch preview so confirmation does not refetch or trust client-submitted character rows.
- Diff preview showing added, removed/no-longer-Jaruna, and changed characters.
- Confirm/apply flow that updates changed characters, adds new characters, deletes removed characters, and removes deleted characters from affected squads.
- Shared users remain unable to refetch.

## Context / Current State

Relevant plan: `docs/squad-builder-plan.md`, Slice 4.

Existing/planned foundation:

- Slice 1 established:
  - Firecrawl SDK-backed profile scrape.
  - Firecrawl request ledger and monthly budget protection.
  - Margonem profile HTML parser returning Jaruna-only `MargonemCharacterPreview[]`.
  - `margonem_accounts`, `margonem_characters`, `squad_groups`, `squads`, and `squad_characters` schema.
- Slice 2 established/plans:
  - Accounts page.
  - Owned account import/list.
  - Pending account import previews to avoid confirmation refetch/client-trusted characters.
- Slice 3 established/plans:
  - Accepted shared account access.
  - Shared users cannot refetch accounts.
  - Owner-only authorization seam for refetch:

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

Build-order note from the plan: Slice 4 is recommended after Slice 5. That means real squad rows should exist when implementing deletion cleanup. If Slice 4 is built earlier, keep the cleanup contract but defer the full squad cleanup integration test until squad editing exists.

Current gap:

```txt
Saved Margonem accounts have lastFetchedAt and stored Jaruna characters,
but owners cannot manually refresh them, compare latest profile data, or apply removals/updates safely.
```

## Goals

- Let only the account owner start and apply a refetch.
- Fetch latest profile HTML through the existing Firecrawl-backed path after budget validation.
- Show a diff before applying changes.
- Keep changed characters in squads and update displayed metadata.
- Delete removed/no-longer-Jaruna characters from storage.
- Remove deleted characters from all affected squads through FK cascade or explicit deletion.
- Do not spend Firecrawl credits for shared users or non-owners.
- Do not refetch during confirmation.
- Do not trust client-submitted diff/characters.
- Update account `lastFetchedAt` and account display-name suggestion only where explicitly owned by the refetch contract.

## Non-Goals

- No automatic/stale scheduled refetch.
- No direct Margonem scraping fallback.
- No shared-user refetch.
- No editing account display name in this slice unless already implemented in Slice 2.
- No clan parsing unless parser support already exists; clan remains out of scope if not parseable from the fixture.
- No historical audit UI for old character values.
- No notification system for squad changes caused by refetch.

## Invariants

```ts
type AccountRefetchInvariant =
  | "Only the Margonem account owner can preview a refetch"
  | "Only the Margonem account owner can apply a pending refetch"
  | "Shared accepted users cannot refetch accounts"
  | "Refetch confirmation never trusts client-submitted character rows or diffs"
  | "A pending refetch preview can be applied at most once"
  | "Only Jaruna characters are stored after refetch apply"
  | "Changed characters keep their database identity and squad membership"
  | "Removed or no-longer-Jaruna characters are removed from all squads"
  | "Applying a refetch updates account lastFetchedAt"
  | "Firecrawl is never called before owner authorization and budget reservation";
```

## Design Constraints

- Reuse the existing `FirecrawlClient`, Firecrawl budget ledger, and `parseMargonemProfileHtml` parser.
- Do not hold database transactions while calling Firecrawl.
- Use a pending refetch preview table to bridge preview and apply without refetching or trusting the client.
- Treat stored DB rows as persistence boundary input and parse/project through the persistence adapter.
- Expected failures are typed in service modules and translated to ORPC errors in the router.
- The Accounts page remains a product workflow: inline diff and confirmation, not a decorative modal-first flow.
- Firecrawl failures and parser failures get safe server-side logs without raw HTML or arbitrary cause serialization.

## Alternatives Considered

### Option 1: Apply latest scrape immediately

```txt
owner clicks refetch
  -> authorize owner
  -> Firecrawl scrape
  -> parse latest characters
  -> transaction applies additions/updates/deletions immediately
  -> UI shows result summary
```

Pros:

- Smallest API surface.
- No pending refetch table.

Cons:

- Violates the plan's diff confirmation requirement.
- Owner cannot review destructive removals before affected squads are changed.
- Harder to explain why squad characters disappeared.

### Option 2: Client-held diff, server revalidates by refetching on apply

```txt
preview endpoint scrapes and returns diff
client holds diff
apply endpoint refetches again, recomputes diff, applies latest
```

Pros:

- Server does not trust client diff.
- No pending refetch storage.

Cons:

- Doubles Firecrawl spend for every applied refetch.
- Preview and apply may show/apply different data if profile changes between calls.
- Worse user experience for scarce Firecrawl budget.

### Option 3: Server-held pending refetch preview with apply-by-id

```txt
preview endpoint:
  authorize owner -> reserve Firecrawl -> scrape -> parse -> compare -> persist pending refetch
apply endpoint:
  authorize owner -> load pending refetch rows -> transaction applies stored latest data
```

Pros:

- Satisfies diff confirmation.
- Does not trust client-submitted character rows.
- Does not spend Firecrawl twice.
- Uses real seams: Firecrawl adapter, parser, persistence adapter, service orchestration.
- Provides deterministic apply behavior matching the displayed diff.

Cons:

- Adds two pending refetch tables and cleanup/expiry policy.
- Slightly more implementation surface.

## Recommendation

Use **Option 3: Server-held pending refetch preview with apply-by-id**.

This is the smallest design that satisfies Firecrawl budget safety, destructive-change confirmation, and server-owned data integrity.

## Proposed Design

Add two new API operations under `squadBuilder`:

```ts
squadBuilder.previewAccountRefetch(input: PreviewAccountRefetchDto)
squadBuilder.applyAccountRefetch(input: ApplyAccountRefetchDto)
```

Frontend flow:

```txt
Owned Accounts list
  -> owner clicks "Odśwież"
  -> previewAccountRefetch(accountId)
  -> UI renders diff: added / removed / changed / unchanged counts
  -> owner clicks "Zastosuj zmiany"
  -> applyAccountRefetch(refetchPreviewId)
  -> listOwnedAccounts invalidates
  -> affected squad data queries invalidate when Slice 5 query keys exist
```

Shared accounts list must not render refetch controls. Backend still enforces owner-only authorization.

## Domain Model and Types

### Pending refetch id

```ts
export type PendingMargonemAccountRefetchId = number & {
  readonly __brand: "PendingMargonemAccountRefetchId";
};

export type InvalidPendingMargonemAccountRefetchId = {
  readonly _tag: "InvalidPendingMargonemAccountRefetchId";
};

export const parsePendingMargonemAccountRefetchId = (
  input: number
): Result<PendingMargonemAccountRefetchId, InvalidPendingMargonemAccountRefetchId>;
```

### Stored character snapshot

```ts
export type StoredMargonemCharacterSnapshot = {
  readonly databaseCharacterId: number;
  readonly margonemCharacterId: MargonemCharacterId;
  readonly name: string;
  readonly level: PositiveLevel;
  readonly profession: MargonemProfession;
  readonly avatarUrl: string | null;
  readonly world: MargonemWorld;
};
```

`databaseCharacterId` is the local `margonem_characters.id`, used to preserve/update existing rows and squad membership.

### Refetch diff

```ts
export type MargonemAccountRefetchDiff = {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly added: readonly AddedMargonemCharacterDiff[];
  readonly removed: readonly RemovedMargonemCharacterDiff[];
  readonly changed: readonly ChangedMargonemCharacterDiff[];
  readonly unchangedCount: number;
};

export type AddedMargonemCharacterDiff = {
  readonly _tag: "AddedCharacter";
  readonly latest: MargonemCharacterPreview;
};

export type RemovedMargonemCharacterDiff = {
  readonly _tag: "RemovedCharacter";
  readonly current: StoredMargonemCharacterSnapshot;
  readonly reason: "missingFromLatestJarunaProfile";
};

export type ChangedMargonemCharacterDiff = {
  readonly _tag: "ChangedCharacter";
  readonly databaseCharacterId: number;
  readonly margonemCharacterId: MargonemCharacterId;
  readonly changes: readonly MargonemCharacterFieldChange[];
  readonly current: StoredMargonemCharacterSnapshot;
  readonly latest: MargonemCharacterPreview;
};

export type MargonemCharacterFieldChange =
  | {
      readonly field: "name";
      readonly before: string;
      readonly after: string;
    }
  | {
      readonly field: "level";
      readonly before: PositiveLevel;
      readonly after: PositiveLevel;
    }
  | {
      readonly field: "profession";
      readonly before: MargonemProfession;
      readonly after: MargonemProfession;
    }
  | {
      readonly field: "avatarUrl";
      readonly before: string | null;
      readonly after: string | null;
    };
```

No clan field appears until the parser and storage actually own a `clanName` contract. If clan support is added before Slice 4, include it as another `MargonemCharacterFieldChange` variant.

### Diff computation

```ts
export type ComputeMargonemAccountRefetchDiffInput = {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly currentCharacters: readonly StoredMargonemCharacterSnapshot[];
  readonly latestCharacters: readonly MargonemCharacterPreview[];
};

/** Compute a Jaruna-only character diff for a refetched Margonem account. */
export const computeMargonemAccountRefetchDiff = (
  input: ComputeMargonemAccountRefetchDiffInput
): MargonemAccountRefetchDiff;
```

Matching key:

```ts
type CharacterMatchKey = MargonemCharacterId;
```

Rules:

- Latest id not in current -> `added`.
- Current id not in latest -> `removed`.
- Same id with changed `name`, `level`, `profession`, or `avatarUrl` -> `changed`.
- Same id with no field changes -> contributes to `unchangedCount`.

## Types, Interfaces, and APIs

### Protocol DTOs

```ts
export type PreviewAccountRefetchDto = {
  readonly accountId: number;
};

export type PreviewAccountRefetchResponseDto = {
  readonly refetchPreviewId: number;
  readonly accountId: number;
  readonly profileId: number;
  readonly generatedProfileUrl: string;
  readonly fetchedAt: string;
  readonly firecrawlCreditsUsed: number;
  readonly diff: AccountRefetchDiffDto;
};

export type AccountRefetchDiffDto = {
  readonly added: readonly AccountRefetchAddedCharacterDto[];
  readonly removed: readonly AccountRefetchRemovedCharacterDto[];
  readonly changed: readonly AccountRefetchChangedCharacterDto[];
  readonly unchangedCount: number;
};

export type AccountRefetchAddedCharacterDto = {
  readonly characterId: number;
  readonly name: string;
  readonly level: number;
  readonly profession: MargonemProfession;
  readonly avatarUrl: string | null;
};

export type AccountRefetchRemovedCharacterDto = {
  readonly databaseCharacterId: number;
  readonly characterId: number;
  readonly name: string;
  readonly level: number;
  readonly profession: MargonemProfession;
  readonly avatarUrl: string | null;
  readonly affectedSquadCount: number;
};

export type AccountRefetchChangedCharacterDto = {
  readonly databaseCharacterId: number;
  readonly characterId: number;
  readonly name: string;
  readonly changes: readonly {
    readonly field: "name" | "level" | "profession" | "avatarUrl";
    readonly before: string | number | null;
    readonly after: string | number | null;
  }[];
};

export type ApplyAccountRefetchDto = {
  readonly refetchPreviewId: number;
};

export type ApplyAccountRefetchResponseDto = {
  readonly accountId: number;
  readonly profileId: number;
  readonly lastFetchedAt: string;
  readonly addedCharacterCount: number;
  readonly updatedCharacterCount: number;
  readonly removedCharacterCount: number;
  readonly removedSquadCharacterCount: number;
};
```

### Service contracts

```ts
export type PreviewAccountRefetchInput = {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
};

export type PreviewAccountRefetchOutput = {
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly fetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly diff: MargonemAccountRefetchDiff;
};

export type PreviewAccountRefetchError =
  | MargonemAccountNotFound
  | ActorDoesNotOwnMargonemAccount
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

export class PreviewAccountRefetch {
  constructor(
    private readonly authorizer: MargonemAccountOwnerAuthorizer,
    private readonly accountReader: RefetchableMargonemAccountReader,
    private readonly refetchStore: PendingMargonemAccountRefetchStore,
    private readonly ledger: FirecrawlRequestLedger,
    private readonly firecrawl: FirecrawlClient,
    private readonly clock: Clock,
    private readonly config: FirecrawlConfig
  ) {}

  /** Fetch latest account HTML and store a pending refetch diff for owner confirmation. */
  preview(
    input: PreviewAccountRefetchInput,
    options?: { readonly signal?: AbortSignal }
  ): Promise<Result<PreviewAccountRefetchOutput, PreviewAccountRefetchError>>;
}
```

```ts
export type ApplyAccountRefetchInput = {
  readonly actorUserId: AppUserId;
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
};

export type ApplyAccountRefetchOutput = {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly lastFetchedAt: Date;
  readonly addedCharacterCount: number;
  readonly updatedCharacterCount: number;
  readonly removedCharacterCount: number;
  readonly removedSquadCharacterCount: number;
};

export type ApplyAccountRefetchError =
  | PendingMargonemAccountRefetchNotFound
  | MargonemAccountNotFound
  | ActorDoesNotOwnMargonemAccount
  | SquadBuilderPersistenceUnavailable;

export class ApplyAccountRefetch {
  constructor(
    private readonly authorizer: MargonemAccountOwnerAuthorizer,
    private readonly refetchStore: PendingMargonemAccountRefetchStore,
    private readonly accountWriter: RefetchedMargonemAccountWriter,
    private readonly clock: Clock
  ) {}

  /** Apply a previously previewed account refetch to account and character storage. */
  apply(
    input: ApplyAccountRefetchInput
  ): Promise<Result<ApplyAccountRefetchOutput, ApplyAccountRefetchError>>;
}
```

### Persistence seams

```ts
export interface RefetchableMargonemAccountReader {
  readonly getAccountForRefetch: (input: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }) => Promise<
    Result<
      RefetchableMargonemAccount,
      | MargonemAccountNotFound
      | ActorDoesNotOwnMargonemAccount
      | SquadBuilderPersistenceUnavailable
    >
  >;
}

export type RefetchableMargonemAccount = {
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly displayName: AccountDisplayName;
  readonly currentCharacters: readonly StoredMargonemCharacterSnapshot[];
};
```

```ts
export interface PendingMargonemAccountRefetchStore {
  readonly createPendingRefetch: (
    input: CreatePendingMargonemAccountRefetchInput
  ) => Promise<
    Result<PendingMargonemAccountRefetch, SquadBuilderPersistenceUnavailable>
  >;

  readonly findPendingRefetchForApply: (
    input: FindPendingMargonemAccountRefetchInput
  ) => Promise<
    Result<
      PendingMargonemAccountRefetchForApply,
      PendingMargonemAccountRefetchNotFound | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly markPendingRefetchApplied: (
    input: MarkPendingMargonemAccountRefetchAppliedInput
  ) => Promise<Result<void, SquadBuilderPersistenceUnavailable>>;
}

export type CreatePendingMargonemAccountRefetchInput = {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly expiresAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly latestCharacters: readonly MargonemCharacterPreview[];
  readonly diff: MargonemAccountRefetchDiff;
};

export type PendingMargonemAccountRefetch = {
  readonly id: PendingMargonemAccountRefetchId;
};

export type FindPendingMargonemAccountRefetchInput = {
  readonly actorUserId: AppUserId;
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
  readonly now: Date;
};

export type PendingMargonemAccountRefetchForApply = {
  readonly id: PendingMargonemAccountRefetchId;
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly latestCharacters: readonly MargonemCharacterPreview[];
};

export type PendingMargonemAccountRefetchNotFound = {
  readonly _tag: "PendingMargonemAccountRefetchNotFound";
};

export type MarkPendingMargonemAccountRefetchAppliedInput = {
  readonly refetchPreviewId: PendingMargonemAccountRefetchId;
  readonly appliedAt: Date;
};
```

```ts
export interface RefetchedMargonemAccountWriter {
  readonly applyRefetchedAccount: (
    input: ApplyRefetchedAccountInput
  ) => Promise<
    Result<ApplyAccountRefetchOutput, SquadBuilderPersistenceUnavailable>
  >;
}

export type ApplyRefetchedAccountInput = {
  readonly actorUserId: AppUserId;
  readonly pendingRefetch: PendingMargonemAccountRefetchForApply;
  readonly now: Date;
};
```

Apply transaction:

```txt
transaction
  -> advisory lock on account id, e.g. hashtext('margonem-refetch:<accountId>')
  -> reload account by id where owner_user_id = actorUserId
  -> reload current characters for account
  -> compare current rows against pending latestCharacters
  -> update existing rows by matching margonem character id
  -> insert added latest rows
  -> delete removed current rows
       cascade deletes squad_characters through FK, or explicitly delete squad_characters first to count removed rows
  -> update margonem_accounts.last_fetched_at = pendingRefetch.fetchedAt
  -> mark pending refetch applied
  -> return counts
```

If the implementation needs an exact `removedSquadCharacterCount`, explicitly count/delete `squad_characters` for removed `margonem_characters.id` values before deleting characters.

## Persistence Schema Additions

Add pending refetch tables in `packages/db/src/schema/squad-builder.ts`.

### Pending refetch header

```ts
export const margonemAccountRefetchPreview = pgTable(
  "margonem_account_refetch_previews",
  {
    id: serial("id").primaryKey(),
    actorUserId: text("actor_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    accountId: integer("account_id")
      .references(() => margonemAccount.id, { onDelete: "cascade" })
      .notNull(),
    profileId: integer("profile_id").notNull(),
    fetchedAt: timestamp("fetched_at").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    appliedAt: timestamp("applied_at"),
    firecrawlCreditsUsed: integer("firecrawl_credits_used").notNull(),
    diffJson: text("diff_json").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("margonem_refetch_previews_actor_status_idx").on(
      table.actorUserId,
      table.appliedAt,
      table.expiresAt
    ),
    index("margonem_refetch_previews_account_id_idx").on(table.accountId),
  ]
);
```

`diffJson` is a protocol/persistence projection used only to render the same preview after creation if needed. Applying should use normalized latest character rows below, not client-submitted diff JSON.

### Pending refetch latest characters

```ts
export const margonemAccountRefetchPreviewCharacter = pgTable(
  "margonem_account_refetch_preview_characters",
  {
    id: serial("id").primaryKey(),
    refetchPreviewId: integer("refetch_preview_id")
      .references(() => margonemAccountRefetchPreview.id, {
        onDelete: "cascade",
      })
      .notNull(),
    characterId: integer("character_id").notNull(),
    name: text("name").notNull(),
    level: integer("level").notNull(),
    profession: text("profession").notNull(),
    world: text("world").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("margonem_refetch_preview_characters_unique").on(
      table.refetchPreviewId,
      table.characterId
    ),
    index("margonem_refetch_preview_characters_preview_idx").on(
      table.refetchPreviewId
    ),
  ]
);
```

Retention policy:

```ts
const pendingRefetchPolicy = {
  expiresAfterMinutes: 30,
} as const;
```

Expired pending refetches are ignored by apply. Cleanup job is out of scope.

## Seams, Boundaries, Adapters, and Implementations

### Domain modules

```txt
packages/api/src/modules/squad-builder/pending-margonem-account-refetch-id.ts
packages/api/src/modules/squad-builder/margonem-account-refetch-diff.ts
```

Own pending refetch id parsing and pure diff computation.

### Service modules

```txt
packages/api/src/modules/squad-builder/preview-account-refetch.ts
packages/api/src/modules/squad-builder/apply-account-refetch.ts
```

Own owner authorization, Firecrawl sequencing, pending refetch lifecycle, and apply orchestration.

### External adapter modules

```txt
packages/api/src/modules/squad-builder/firecrawl-client.ts
packages/api/src/modules/squad-builder/margonem-profile-html-parser.ts
```

Reuse unchanged unless parser needs clan support. Firecrawl adapter remains the only SDK boundary.

### Persistence adapter

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Extend existing Drizzle adapter with:

- owner authorizer implementation if not already added in Slice 3;
- current account/character read for refetch;
- pending refetch create/find/mark methods;
- transactional apply with squad cleanup counts.

### Router boundary

```txt
packages/api/src/routers/squad-builder.ts
```

Owns DTO parsing, session parsing, service composition, protocol projection, ORPC error translation, and safe logging.

### Frontend page

```txt
apps/web/src/pages/dashboard/squad-builder/accounts.tsx
```

Extend owned accounts list with refetch controls and diff confirmation UI. Shared-with-me account rows must not render refetch controls.

## Call Stacks and Data Flow

### Current / Old Flow

```txt
Owned account list
  -> displays account name/profile link/lastFetchedAt/characterCount
  -> no owner refetch action
  -> stored characters remain unchanged after initial import
```

### Proposed / New Flow: Preview Refetch

```txt
owner clicks "Odśwież" on owned account
  -> ORPC DTO { accountId: number }
  -> zod DTO parser
  -> parseAppUserId(context.session.user.id)
  -> parseMargonemAccountId(accountId)
  -> PreviewAccountRefetch.preview({ actorUserId, accountId })
  -> authorizer.authorizeOwner({ actorUserId, accountId })
  -> accountReader.getAccountForRefetch({ actorUserId, accountId })
       returns profileId + current StoredMargonemCharacterSnapshot[]
  -> firecrawlYearMonthFromDate(clock.now())
  -> ledger.reserveRequest({ profileId, requestedByUserId: actorUserId, yearMonth, budget })
  -> firecrawl.scrapeProfileHtml(profileId, { signal })
  -> ledger.markRequestSucceeded/Failed
  -> parseMargonemProfileHtml({ profileId, html })
  -> computeMargonemAccountRefetchDiff({ currentCharacters, latestCharacters })
  -> refetchStore.createPendingRefetch({ latestCharacters, diff, expiresAt })
  -> PreviewAccountRefetchOutput
  -> router protocol projection
  -> UI renders diff confirmation
```

### Proposed / New Flow: Apply Refetch

```txt
owner clicks "Zastosuj zmiany"
  -> ORPC DTO { refetchPreviewId: number }
  -> zod DTO parser
  -> parseAppUserId(context.session.user.id)
  -> parsePendingMargonemAccountRefetchId(refetchPreviewId)
  -> ApplyAccountRefetch.apply({ actorUserId, refetchPreviewId })
  -> refetchStore.findPendingRefetchForApply({ actorUserId, refetchPreviewId, now })
  -> authorizer.authorizeOwner({ actorUserId, accountId: pending.accountId })
  -> accountWriter.applyRefetchedAccount({ pendingRefetch, actorUserId, now })
       transaction updates/adds/deletes characters and account lastFetchedAt
  -> refetchStore.markPendingRefetchApplied
  -> ApplyAccountRefetchOutput
  -> router protocol projection
  -> invalidate owned accounts and squad queries
```

### Failure Flow

```txt
shared user clicks/refetches by crafted request
  -> ActorDoesNotOwnMargonemAccount
  -> no budget reservation
  -> no Firecrawl request
  -> ORPC FORBIDDEN

account not found
  -> MargonemAccountNotFound
  -> no budget reservation
  -> ORPC NOT_FOUND

monthly budget exhausted
  -> FirecrawlMonthlyBudgetExhausted
  -> no Firecrawl request
  -> ORPC TOO_MANY_REQUESTS

Firecrawl fails
  -> FirecrawlScrapeError
  -> reserved request marked failed
  -> safe server log
  -> ORPC BAD_GATEWAY

HTML parser fails
  -> ParseMargonemProfileHtmlError
  -> reserved request remains succeeded because Firecrawl succeeded
  -> safe server log
  -> ORPC BAD_GATEWAY

pending refetch expired/applied/not actor-owned
  -> PendingMargonemAccountRefetchNotFound
  -> ORPC NOT_FOUND or CONFLICT
  -> UI asks user to preview again

account ownership changed/deleted between preview and apply
  -> MargonemAccountNotFound | ActorDoesNotOwnMargonemAccount
  -> ORPC NOT_FOUND/FORBIDDEN
```

### Retry / Cancellation / Idempotency Flow

- Preview accepts caller-owned `AbortSignal` and passes it to `FirecrawlClient`.
- Owner authorization and current account load happen before Firecrawl budget reservation.
- No database transaction is held during Firecrawl call.
- Apply is retry-safe after success because the pending refetch is marked applied; repeated apply returns `PendingMargonemAccountRefetchNotFound`/conflict semantics.
- Apply uses an account-scoped transaction/advisory lock to serialize concurrent applies for the same account.
- Refetch preview may be retried by the user and may spend a new Firecrawl request. The UI should keep the latest pending preview and avoid automatic retry mutations.

### Observability Flow

Safe fields:

```ts
type AccountRefetchLogFields = {
  readonly operation: "previewAccountRefetch" | "applyAccountRefetch";
  readonly actorUserId?: string;
  readonly accountId?: number;
  readonly profileId?: number;
  readonly refetchPreviewId?: number;
  readonly errorTag?: string;
  readonly addedCharacterCount?: number;
  readonly updatedCharacterCount?: number;
  readonly removedCharacterCount?: number;
  readonly removedSquadCharacterCount?: number;
};
```

Log dependency/persistence failures and successful destructive apply summaries. Do not log raw profile URL, raw HTML, Firecrawl API key, request bodies, or arbitrary `cause` serialization.

## UI Design Notes

Accounts page additions:

```txt
Owned account row/details
  - account display name
  - generated profile link
  - last fetched time
  - character count
  - owner-only "Odśwież" button
```

Diff confirmation should be inline in the account's expanded area or a focused sheet/dialog only if the existing page cannot support inline expansion. Prefer inline because the user needs to compare account context and changes.

Diff sections:

```txt
Dodane postacie
Usunięte z Jaruny / profilu
Zmienione postacie
Bez zmian: N
```

Polish copy examples:

```txt
Refetch button: "Odśwież"
Preview loading: "Pobieranie aktualnych postaci..."
Apply button: "Zastosuj zmiany"
Cancel button: "Nie teraz"
No changes: "Nie znaleziono zmian w postaciach z Jaruny."
Removed warning: "Usunięte postacie znikną też z zapisanych składów."
Expired preview: "Podgląd odświeżenia wygasł. Pobierz profil ponownie."
Shared account tooltip/copy: "Tylko właściciel konta może odświeżać postacie."
```

Accessibility:

- Destructive removal warning is text, not color-only.
- Changed fields are listed with before/after labels.
- Apply button stays disabled while apply mutation is pending.
- External profile links use `target="_blank" rel="noopener"`.

## Files to Add / Change / Delete

### Add

```txt
packages/api/src/modules/squad-builder/pending-margonem-account-refetch-id.ts
```

Owns pending refetch id parser.

```txt
packages/api/src/modules/squad-builder/margonem-account-refetch-diff.ts
```

Owns pure diff computation and field-change types.

```txt
packages/api/src/modules/squad-builder/preview-account-refetch.ts
```

Service module for owner-authorized Firecrawl preview and pending refetch persistence.

```txt
packages/api/src/modules/squad-builder/apply-account-refetch.ts
```

Service module for owner-authorized pending refetch apply.

```txt
packages/api/src/modules/squad-builder/margonem-account-refetch-diff.test.ts
packages/api/src/modules/squad-builder/preview-account-refetch.test.ts
packages/api/src/modules/squad-builder/apply-account-refetch.test.ts
```

Focused behavior tests.

### Change

```txt
packages/db/src/schema/squad-builder.ts
```

Add pending refetch preview tables and export them in `squadBuilder`.

```txt
packages/db/src/types.ts
```

Export inferred select models for pending refetch tables.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Implement refetch reader/store/writer methods and transactional apply cleanup.

```txt
packages/api/src/routers/squad-builder.ts
```

Add `previewAccountRefetch` and `applyAccountRefetch` endpoints, protocol projections, and error translation.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.integration.test.ts
```

Add real Postgres tests for apply semantics and squad cleanup.

```txt
packages/api/src/test/integration/database.ts
```

Truncate new pending refetch tables in test cleanup.

```txt
apps/web/src/pages/dashboard/squad-builder/accounts.tsx
```

Add owner-only refetch controls and diff confirmation UI.

### Delete

None.

## RGR TDD Test Plan

### 1. Parse pending refetch ids

RED:

```ts
it("accepts positive integer pending refetch ids", () => {});
it("rejects non-positive or non-integer pending refetch ids", () => {});
```

GREEN: implement `pending-margonem-account-refetch-id.ts`.

### 2. Compute added and removed character diff

RED:

```ts
it("computes added and removed Jaruna characters by Margonem character id", () => {});
```

GREEN: implement base `computeMargonemAccountRefetchDiff`.

### 3. Compute changed and unchanged character diff

RED:

```ts
it("computes name, level, profession, and avatar changes while counting unchanged characters", () => {});
```

GREEN: implement field-level diff.

### 4. Preview rejects non-owner before Firecrawl budget reservation

RED:

```ts
it("rejects refetch preview for a non-owner without reserving Firecrawl budget", async () => {});
```

Use object/factory recording fakes for authorizer, ledger, Firecrawl, and refetch store.

GREEN: implement authorization-first service ordering.

### 5. Preview returns and stores a diff for owner

RED:

```ts
it("stores a pending refetch and returns a diff for an owned account", async () => {});
```

GREEN: implement `PreviewAccountRefetch` orchestration with fake Firecrawl HTML/parser path or fake Firecrawl success.

### 6. Preview marks Firecrawl request failed on scrape failure

RED:

```ts
it("marks the reserved Firecrawl request failed when refetch scrape fails", async () => {});
```

GREEN: mirror existing preview failure behavior.

### 7. Apply rejects expired/applied pending refetch

RED:

```ts
it("rejects applying an expired or already applied refetch preview", async () => {});
```

GREEN: implement pending lookup contract.

### 8. Apply requires owner at apply time

RED:

```ts
it("rechecks account ownership before applying a pending refetch", async () => {});
```

GREEN: call `authorizeOwner` after pending lookup and before writer apply.

### 9. Drizzle integration: apply adds new characters

RED:

```ts
it("adds latest Jaruna characters that were not previously stored", async () => {});
```

GREEN: implement insert branch in transactional writer.

### 10. Drizzle integration: apply updates changed characters in place

RED:

```ts
it("updates changed character metadata without changing local character ids", async () => {});
```

Assert squad membership remains for changed character rows.

GREEN: implement update branch by Margonem character id.

### 11. Drizzle integration: apply removes missing characters from squads

RED:

```ts
it("deletes removed characters and removes them from affected squads", async () => {});
```

Use real Postgres because this proves FK/cascade or explicit cleanup semantics.

GREEN: implement delete branch and removed squad-character count.

### 12. Drizzle integration: apply updates account lastFetchedAt and marks preview applied

RED:

```ts
it("updates lastFetchedAt and prevents applying the same refetch twice", async () => {});
```

GREEN: finish apply transaction and applied marker.

### 13. Router integration: preview/apply error translation

RED:

```ts
it("returns forbidden when a shared user previews refetch for an account", async () => {});
it("returns too many requests when Firecrawl budget is exhausted", async () => {});
```

GREEN: add router endpoints and `toOrpcError` variants.

### 14. Accounts page renders diff confirmation

RED:

```ts
it("lets an owner preview refetch, review added/removed/changed characters, and apply the diff", async () => {});
```

If no frontend test harness exists, document the UI automation gap and rely on service/router/integration tests plus type checks.

## Risks and Open Questions

1. **Clan field remains unresolved.** The plan mentions nullable clan, but the Slice 1 parser intentionally did not parse clan because it is not reliable in the fixture. Do not include clan in the Slice 4 diff until parser/storage support exists.
2. **Build-order dependency on Slice 5.** Full squad cleanup evidence requires real saved squad rows. If Slice 4 is implemented before Slice 5, add the integration test once Slice 5 lands.
3. **Pending refetch storage duplicates latest character data.** This is intentional to avoid a second Firecrawl request and avoid client-trusted diffs.
4. **Multiple pending refetches for one account.** The simplest rule allows multiple pending previews but apply serializes by account lock and marks only the applied preview. The UI should keep the latest preview. If product wants only one pending preview per account, add a partial unique/current-preview policy later.
5. **Firecrawl cost on repeated preview.** Manual repeated previews can spend multiple requests. The UI should not auto-preview; all refetches require explicit owner action.

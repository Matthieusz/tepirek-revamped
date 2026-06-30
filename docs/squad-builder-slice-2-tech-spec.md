# Squad Builder Slice 2 Tech Spec

## Summary

Build the owned accounts import/list flow for logged-in verified users:

- Accounts dashboard route.
- Multiline batch import input, one Margonem profile URL per line.
- Server-owned batch pre-fetch validation before Firecrawl spend.
- Firecrawl-backed preview for each valid unique profile.
- Server-persisted pending import previews so confirmation does not refetch or trust client-submitted characters.
- Editable account display name on confirmation.
- Confirmed save into `margonem_accounts` and `margonem_characters`.
- Owned accounts list with account name, generated Margonem profile link, last fetched time, and Jaruna character count.

This slice turns Slice 1's single-profile preview foundation into a usable owner-only import workflow while preserving Firecrawl budget safety.

## Context / Current State

Existing Slice 1 foundation:

- `docs/squad-builder-plan.md` defines Slice 2 as owned account import/list.
- `packages/db/src/schema/squad-builder.ts` already has:
  - `margonemAccount`
  - `margonemCharacter`
  - `margonemAccountAccess`
  - squad foundation tables
  - `firecrawlProfileScrapeRequest`
- `packages/api/src/modules/squad-builder/preview-margonem-profile-import.ts` previews one profile without saving it.
- `packages/api/src/modules/squad-builder/squad-builder-store.ts` owns duplicate/access lookup and Firecrawl ledger behavior.
- `packages/api/src/routers/squad-builder.ts` exposes `previewProfileImport`.
- `apps/web` uses:
  - TanStack Router file routes under `apps/web/src/routes/dashboard/**`
  - page components under `apps/web/src/pages/dashboard/**`
  - ORPC TanStack Query utilities from `apps/web/src/utils/orpc.ts`
  - dark product UI tokens in `apps/web/src/index.css`
  - sidebar navigation in `apps/web/src/components/sidebar/app-sidebar.tsx`

Important current limitation:

```txt
Slice 1 preview returns parsed account/character data to the client,
but does not save anything server-side.
```

For Slice 2, confirmation must not accept arbitrary client-submitted characters as truth. The backend needs a pending import persistence boundary between preview and save.

## Goals

- Let a verified logged-in user paste multiple Margonem profile URLs.
- Parse and deduplicate profile ids on the server before any Firecrawl call.
- Return per-line validation/fetch/parse results, not all-or-nothing failure for the whole batch.
- Prevent Firecrawl spend for:
  - invalid URLs;
  - duplicate profile ids in the same pasted batch;
  - accounts already owned by the actor;
  - accounts owned by another user;
  - accounts already shared with the actor;
  - exhausted monthly app budget.
- Persist successful previews as pending imports owned by the actor.
- Confirm a pending import with an edited display name without refetching Firecrawl.
- Insert the account and its Jaruna characters transactionally.
- Show owned accounts with profile link, last fetched time, and character count.
- Keep Polish UI copy direct and task-focused.

## Non-Goals

- No account sharing invites.
- No shared-with-me accounts list.
- No owner-only refetch button or diff confirmation.
- No squad builder UI.
- No global squad visibility.
- No direct Margonem scraping fallback.
- No long-lived import history UI beyond pending previews needed for this flow.

## Invariants

```ts
type SliceTwoInvariant =
  | "Only the pending import owner can confirm that pending import"
  | "Confirming an import never trusts client-submitted character rows"
  | "A confirmed Margonem profile id can belong to only one app user"
  | "Only Jaruna characters are saved"
  | "Characters are saved in the same transaction as their account"
  | "Invalid and duplicate batch lines do not reserve Firecrawl budget"
  | "Already-owned/shared/unavailable profiles do not reserve Firecrawl budget"
  | "A pending import can be confirmed at most once"
  | "Owned accounts list only returns accounts owned by the actor";
```

## Design Constraints

- Firecrawl remains scarce. Avoid confirmation refetches.
- Router boundaries parse protocol DTOs; service modules receive parsed/domain values where practical.
- DB rows are persistence boundary input. Persistence adapters own projections to/from rows.
- Expected failures stay typed in service modules and translate to ORPC errors only at router boundaries.
- Do not log raw profile URLs, raw Firecrawl HTML, raw request bodies, or arbitrary `cause` values.
- Product UI should follow the existing dark, restrained dashboard system: dense but clear, no decorative cards, no modal-first import flow.

## Alternatives Considered

### Option 1: Client calls existing single preview endpoint per URL, then sends preview payload back on save

```txt
textarea lines
  -> client splits/dedupes
  -> N x squadBuilder.previewProfileImport
  -> client edits displayName
  -> confirm endpoint receives { profileId, displayName, characters }
  -> save DB rows
```

Pros:

- Least backend work.
- Reuses current `previewProfileImport` as-is.

Cons:

- Batch duplicate validation is client-owned and bypassable.
- Save would either trust client-submitted characters or need another Firecrawl request.
- Per-line errors and budget behavior become fragmented.
- Firecrawl requests may start before the full batch is validated.

### Option 2: Confirm endpoint refetches Firecrawl from profile URL

```txt
preview endpoint fetches Firecrawl for UX
confirm endpoint fetches Firecrawl again for trusted save
```

Pros:

- Save does not trust client data.
- No pending preview storage.

Cons:

- Doubles Firecrawl spend for every successful import.
- Violates the plan's “heavily rate limited” constraint.
- User can see one preview and save different refetched data if profile changes between calls.

### Option 3: Server-owned batch preview plus pending import storage

```txt
textarea lines
  -> batch preview endpoint
  -> parse/dedupe/check access for all lines before Firecrawl
  -> fetch valid unique profiles
  -> persist successful parsed previews as pending imports
  -> client edits displayName
  -> confirm endpoint receives { pendingImportId, displayName }
  -> transaction inserts account + characters from pending rows
```

Pros:

- Backend owns batch pre-fetch validation.
- Confirmation does not refetch and does not trust client-submitted characters.
- Pending rows create a real seam between preview and save.
- Service tests can use recording fakes for Firecrawl and real Postgres for persistence.
- Later Slice 4 refetch can reuse account/character persistence projections without adopting client-trusted data.

Cons:

- Adds two small pending import tables and cleanup considerations.
- Slightly more backend API surface.

## Recommendation

Use **Option 3: Server-owned batch preview plus pending import storage**.

This keeps Firecrawl budget protection, duplicate validation, preview data integrity, and confirmation idempotency in backend-owned modules. It adds minimal schema that directly supports the Slice 2 workflow.

## Proposed Design

Expose three new/changed backend capabilities:

```ts
squadBuilder.previewOwnedAccountImports(input: PreviewOwnedAccountImportsDto)
squadBuilder.confirmOwnedAccountImport(input: ConfirmOwnedAccountImportDto)
squadBuilder.listOwnedAccounts()
```

Keep the existing `previewProfileImport` endpoint for Slice 1 tests or replace it internally with the batch service only if no caller remains. The UI should use the batch endpoint.

Frontend flow:

```txt
Accounts page
  -> user pastes URLs
  -> submit preview batch
  -> per-line result list appears inline
  -> successful preview rows show editable displayName input
  -> user confirms each account or confirms all selected valid previews
  -> owned accounts query invalidates
  -> imported accounts appear in list
```

## Domain Model and Types

### Account display name

```ts
export type AccountDisplayName = string & {
  readonly __brand: "AccountDisplayName";
};

export type InvalidAccountDisplayName = {
  readonly _tag: "InvalidAccountDisplayName";
  readonly message: string;
};

/** Parse a user-facing account display name for storage. */
export const parseAccountDisplayName = (
  input: string
): Result<AccountDisplayName, InvalidAccountDisplayName>;
```

Rules:

```ts
const accountDisplayNameRules = {
  minLength: 1,
  maxLength: 80,
  trim: true,
} as const;
```

### Pending import identity

```ts
export type PendingMargonemAccountImportId = number & {
  readonly __brand: "PendingMargonemAccountImportId";
};

export type InvalidPendingMargonemAccountImportId = {
  readonly _tag: "InvalidPendingMargonemAccountImportId";
};

export const parsePendingMargonemAccountImportId = (
  input: number
): Result<
  PendingMargonemAccountImportId,
  InvalidPendingMargonemAccountImportId
>;
```

### Owned account read model

```ts
export type OwnedMargonemAccountSummary = {
  readonly accountId: number;
  readonly profileId: MargonemProfileId;
  readonly displayName: AccountDisplayName;
  readonly generatedProfileUrl: string;
  readonly lastFetchedAt: Date;
  readonly characterCount: number;
};
```

## Types, Interfaces, and APIs

### Protocol DTOs

```ts
export type PreviewOwnedAccountImportsDto = {
  readonly profileUrls: readonly string[];
};

export type PreviewOwnedAccountImportsResponseDto = {
  readonly items: readonly PreviewOwnedAccountImportItemDto[];
};

export type PreviewOwnedAccountImportItemDto =
  | PreviewOwnedAccountImportSuccessDto
  | PreviewOwnedAccountImportFailureDto;

export type PreviewOwnedAccountImportSuccessDto = {
  readonly status: "success";
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly pendingImportId: number;
  readonly profileId: number;
  readonly generatedProfileUrl: string;
  readonly suggestedAccountName: string;
  readonly defaultDisplayName: string;
  readonly lastFetchedAt: string;
  readonly firecrawlCreditsUsed: number;
  readonly jarunaCharacters: readonly {
    readonly characterId: number;
    readonly name: string;
    readonly level: number;
    readonly profession: MargonemProfession;
    readonly avatarUrl: string | null;
  }[];
};

export type PreviewOwnedAccountImportFailureDto = {
  readonly status: "error";
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly errorTag: PreviewOwnedAccountImportLineErrorTag;
  readonly message: string;
};

export type ConfirmOwnedAccountImportDto = {
  readonly pendingImportId: number;
  readonly displayName: string;
};

export type ConfirmOwnedAccountImportResponseDto = {
  readonly accountId: number;
  readonly profileId: number;
  readonly displayName: string;
  readonly generatedProfileUrl: string;
  readonly lastFetchedAt: string;
  readonly characterCount: number;
};

export type ListOwnedAccountsResponseDto = {
  readonly accounts: readonly {
    readonly accountId: number;
    readonly profileId: number;
    readonly displayName: string;
    readonly generatedProfileUrl: string;
    readonly lastFetchedAt: string;
    readonly characterCount: number;
  }[];
};
```

Do not include raw HTML, Firecrawl request ids, or persistence row shapes in protocol DTOs.

### Batch preview service

```ts
export interface PreviewOwnedAccountImportsInput {
  readonly actorUserId: AppUserId;
  readonly profileUrls: readonly string[];
}

export type PreviewOwnedAccountImportsOutput = {
  readonly items: readonly PreviewOwnedAccountImportItem[];
};

export type PreviewOwnedAccountImportItem =
  | PreviewOwnedAccountImportSuccess
  | PreviewOwnedAccountImportFailure;

export type PreviewOwnedAccountImportSuccess = {
  readonly _tag: "PreviewSucceeded";
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly suggestedAccountName: string;
  readonly defaultDisplayName: AccountDisplayName;
  readonly lastFetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
};

export type PreviewOwnedAccountImportFailure = {
  readonly _tag: "PreviewFailed";
  readonly lineNumber: number;
  readonly inputUrl: string;
  readonly error: PreviewOwnedAccountImportLineError;
};

export type PreviewOwnedAccountImportLineError =
  | ParseMargonemProfileUrlError
  | DuplicateProfileInBatchError
  | DuplicateMargonemAccountError
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

export type DuplicateProfileInBatchError = {
  readonly _tag: "DuplicateProfileInBatch";
  readonly firstLineNumber: number;
};

export type PreviewOwnedAccountImportsError =
  | TooManyProfileUrlsInBatch
  | EmptyProfileUrlBatch
  | SquadBuilderPersistenceUnavailable;

export type TooManyProfileUrlsInBatch = {
  readonly _tag: "TooManyProfileUrlsInBatch";
  readonly maxUrls: number;
};

export type EmptyProfileUrlBatch = {
  readonly _tag: "EmptyProfileUrlBatch";
};

export class PreviewOwnedAccountImports {
  constructor(
    private readonly singlePreview: PreviewMargonemProfileImport,
    private readonly pendingImports: PendingMargonemAccountImportStore,
    private readonly accountLookup: SquadBuilderAccountLookup,
    private readonly clock: Clock
  ) {}

  /** Preview and persist pending imports for a batch of pasted profile URLs. */
  preview(
    input: PreviewOwnedAccountImportsInput,
    options?: { readonly signal?: AbortSignal }
  ): Promise<
    Result<PreviewOwnedAccountImportsOutput, PreviewOwnedAccountImportsError>
  >;
}
```

Batch policy:

```ts
const batchImportPolicy = {
  maxProfileUrls: 20,
  fetchConcurrency: 2,
} as const;
```

Server-side sequencing:

1. Trim lines and drop blank lines.
2. Reject entire batch if no non-blank URLs.
3. Reject entire batch if non-blank URL count exceeds `maxProfileUrls`.
4. Parse all URLs to profile ids.
5. Mark later occurrences of the same profile id as `DuplicateProfileInBatch`.
6. Check access state for parsed unique profile ids before Firecrawl.
7. Fetch only `Available` unique profile ids.
8. Persist each successful parsed preview as pending import.

### Pending import store seam

```ts
export interface PendingMargonemAccountImportStore {
  readonly createPendingImport: (
    input: CreatePendingMargonemAccountImportInput
  ) => Promise<
    Result<PendingMargonemAccountImport, SquadBuilderPersistenceUnavailable>
  >;

  readonly findPendingImportForConfirmation: (
    input: FindPendingMargonemAccountImportInput
  ) => Promise<
    Result<
      PendingMargonemAccountImportForConfirmation,
      PendingMargonemAccountImportNotFound | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly markPendingImportConfirmed: (
    input: MarkPendingMargonemAccountImportConfirmedInput
  ) => Promise<Result<void, SquadBuilderPersistenceUnavailable>>;
}

export type CreatePendingMargonemAccountImportInput = {
  readonly actorUserId: AppUserId;
  readonly profileId: MargonemProfileId;
  readonly suggestedAccountName: string;
  readonly defaultDisplayName: AccountDisplayName;
  readonly generatedProfileUrl: string;
  readonly fetchedAt: Date;
  readonly expiresAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
};

export type PendingMargonemAccountImport = {
  readonly id: PendingMargonemAccountImportId;
  readonly profileId: MargonemProfileId;
};

export type FindPendingMargonemAccountImportInput = {
  readonly actorUserId: AppUserId;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly now: Date;
};

export type PendingMargonemAccountImportForConfirmation = {
  readonly id: PendingMargonemAccountImportId;
  readonly actorUserId: AppUserId;
  readonly profileId: MargonemProfileId;
  readonly fetchedAt: Date;
  readonly jarunaCharacters: readonly MargonemCharacterPreview[];
};

export type PendingMargonemAccountImportNotFound = {
  readonly _tag: "PendingMargonemAccountImportNotFound";
};

export type MarkPendingMargonemAccountImportConfirmedInput = {
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly confirmedAt: Date;
};
```

### Confirm service

```ts
export interface ConfirmOwnedAccountImportInput {
  readonly actorUserId: AppUserId;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly displayName: string;
}

export type ConfirmOwnedAccountImportOutput = OwnedMargonemAccountSummary;

export type ConfirmOwnedAccountImportError =
  | InvalidAccountDisplayName
  | PendingMargonemAccountImportNotFound
  | DuplicateMargonemAccountError
  | SquadBuilderPersistenceUnavailable;

export interface OwnedMargonemAccountWriter {
  readonly createOwnedAccountFromPendingImport: (
    input: CreateOwnedAccountFromPendingImportInput
  ) => Promise<
    Result<
      OwnedMargonemAccountSummary,
      DuplicateMargonemAccountError | SquadBuilderPersistenceUnavailable
    >
  >;
}

export type CreateOwnedAccountFromPendingImportInput = {
  readonly actorUserId: AppUserId;
  readonly pendingImport: PendingMargonemAccountImportForConfirmation;
  readonly displayName: AccountDisplayName;
};

export class ConfirmOwnedAccountImport {
  constructor(
    private readonly pendingImports: PendingMargonemAccountImportStore,
    private readonly accounts: OwnedMargonemAccountWriter,
    private readonly clock: Clock
  ) {}

  /** Save a previously previewed Margonem account and its Jaruna characters. */
  confirm(
    input: ConfirmOwnedAccountImportInput
  ): Promise<
    Result<ConfirmOwnedAccountImportOutput, ConfirmOwnedAccountImportError>
  >;
}
```

Confirm transaction rules in the Drizzle store:

```txt
transaction
  -> load pending import row for actor where confirmed_at is null and expires_at > now
  -> re-check profile id availability under unique account constraint
  -> insert margonem_accounts(profileId, ownerUserId, displayName, lastFetchedAt)
  -> insert each pending Jaruna character into margonem_characters
  -> mark pending import confirmed
  -> return account summary
```

The database unique index on `margonem_accounts.profile_id` remains the final concurrency guard.

### Owned accounts list service

```ts
export interface OwnedMargonemAccountReader {
  readonly listOwnedAccounts: (
    input: ListOwnedMargonemAccountsInput
  ) => Promise<
    Result<
      readonly OwnedMargonemAccountSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;
}

export type ListOwnedMargonemAccountsInput = {
  readonly actorUserId: AppUserId;
};

export class ListOwnedMargonemAccounts {
  constructor(private readonly accounts: OwnedMargonemAccountReader) {}

  /** List Margonem accounts owned by the actor. */
  list(
    input: ListOwnedMargonemAccountsInput
  ): Promise<
    Result<
      readonly OwnedMargonemAccountSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;
}
```

Sort order:

```txt
margonem_accounts.created_at desc, margonem_accounts.id desc
```

## Persistence Schema Additions

Add pending import tables in `packages/db/src/schema/squad-builder.ts`.

### Pending import header

```ts
export const margonemAccountImportPreview = pgTable(
  "margonem_account_import_previews",
  {
    id: serial("id").primaryKey(),
    actorUserId: text("actor_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    profileId: integer("profile_id").notNull(),
    suggestedAccountName: text("suggested_account_name").notNull(),
    defaultDisplayName: text("default_display_name").notNull(),
    fetchedAt: timestamp("fetched_at").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    confirmedAt: timestamp("confirmed_at"),
    firecrawlCreditsUsed: integer("firecrawl_credits_used").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("margonem_import_previews_actor_status_idx").on(
      table.actorUserId,
      table.confirmedAt,
      table.expiresAt
    ),
    index("margonem_import_previews_profile_id_idx").on(table.profileId),
  ]
);
```

### Pending import characters

```ts
export const margonemAccountImportPreviewCharacter = pgTable(
  "margonem_account_import_preview_characters",
  {
    id: serial("id").primaryKey(),
    importPreviewId: integer("import_preview_id")
      .references(() => margonemAccountImportPreview.id, {
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
    uniqueIndex("margonem_import_preview_characters_unique").on(
      table.importPreviewId,
      table.characterId
    ),
    index("margonem_import_preview_characters_preview_idx").on(
      table.importPreviewId
    ),
  ]
);
```

Retention policy:

```ts
const pendingImportPolicy = {
  expiresAfterMinutes: 30,
} as const;
```

Slice 2 does not need a cleanup job. Confirmation ignores expired rows. A later maintenance slice can delete expired pending rows.

## Seams, Boundaries, Adapters, and Implementations

### Domain modules

```txt
packages/api/src/modules/squad-builder/account-display-name.ts
packages/api/src/modules/squad-builder/pending-margonem-account-import-id.ts
```

Own display-name parsing and pending import id parsing.

### Service modules

```txt
packages/api/src/modules/squad-builder/preview-owned-account-imports.ts
packages/api/src/modules/squad-builder/confirm-owned-account-import.ts
packages/api/src/modules/squad-builder/list-owned-margonem-accounts.ts
```

Own use-case policy and call adapters through narrow interfaces.

### Persistence adapter

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Extend the existing Drizzle adapter to implement:

- `PendingMargonemAccountImportStore`
- `OwnedMargonemAccountWriter`
- `OwnedMargonemAccountReader`

This preserves one cohesive squad-builder persistence External Adapter Module. Do not create one repository per table.

### Router boundary

```txt
packages/api/src/routers/squad-builder.ts
```

Owns:

- Zod DTO parsing.
- BetterAuth session to `AppUserId` parsing.
- Service composition.
- ORPC error translation.
- Safe failure logging.

### Frontend route/page

```txt
apps/web/src/routes/dashboard/squad-builder/accounts.tsx
apps/web/src/pages/dashboard/squad-builder/accounts.tsx
```

The route owns TanStack Router integration and breadcrumb. The page owns UI state, queries, mutations, and product layout.

### Sidebar navigation

```txt
apps/web/src/components/sidebar/app-sidebar.tsx
```

Add a “Budowniczy składów” or “Składy” group/item with Accounts route. Slice 6 can add red-dot invite indicators later.

## Call Stacks and Data Flow

### Current / Old Flow

```txt
No owned accounts page exists.

Existing backend single preview:
raw { profileUrl }
  -> squadBuilder.previewProfileImport
  -> PreviewMargonemProfileImport.preview
  -> duplicate check
  -> Firecrawl budget reservation
  -> Firecrawl scrape
  -> HTML parser
  -> response DTO
  -> no saved account/characters
```

### Proposed / New Flow: Batch Preview

```txt
textarea raw text
  -> client split into lines for basic disabled-state only
  -> ORPC DTO { profileUrls: string[] }
  -> router zod parser: non-empty array, max 20, string items
  -> parseAppUserId(context.session.user.id)
  -> PreviewOwnedAccountImports.preview({ actorUserId, profileUrls })
  -> trim/drop blank lines
  -> parseMargonemProfileUrl for each non-blank line
  -> detect duplicate profile ids in batch
  -> SquadBuilderStore.findProfileAccessState for unique parsed ids
  -> for each Available id, bounded concurrency fetch:
       PreviewMargonemProfileImport.preview({ actorUserId, profileUrl })
  -> for each successful preview:
       SquadBuilderStore.createPendingImport(parsed preview + chars)
  -> service returns per-line success/error items
  -> router protocol projection
  -> React Query mutation result
  -> inline preview list on Accounts page
```

### Proposed / New Flow: Confirm Save

```txt
user edits displayName for one successful pending preview
  -> ORPC DTO { pendingImportId: number, displayName: string }
  -> router zod parser
  -> parseAppUserId(context.session.user.id)
  -> parsePendingMargonemAccountImportId(input.pendingImportId)
  -> ConfirmOwnedAccountImport.confirm({ actorUserId, pendingImportId, displayName })
  -> parseAccountDisplayName(displayName)
  -> SquadBuilderStore.findPendingImportForConfirmation({ actorUserId, pendingImportId, now })
  -> transaction:
       insert margonem_accounts
       insert margonem_characters from pending import character rows
       mark pending import confirmed
  -> OwnedMargonemAccountSummary
  -> router protocol projection
  -> React Query invalidates listOwnedAccounts
  -> account appears in owned accounts list
```

### Proposed / New Flow: Owned Accounts List

```txt
Accounts page mounts
  -> useQuery(orpc.squadBuilder.listOwnedAccounts.queryOptions())
  -> router verifies session
  -> parseAppUserId
  -> ListOwnedMargonemAccounts.list({ actorUserId })
  -> SquadBuilderStore.listOwnedAccounts
       select accounts owned by actor
       left join/count characters
  -> summaries with generated profile URLs
  -> protocol DTO
  -> UI list/table
```

### Failure Flow

```txt
empty submitted batch
  -> EmptyProfileUrlBatch
  -> ORPC BAD_REQUEST
  -> toast or inline form error: "Wklej co najmniej jeden link do profilu."

too many URLs
  -> TooManyProfileUrlsInBatch
  -> ORPC BAD_REQUEST
  -> inline form error includes maxProfileUrls

invalid URL line
  -> per-line PreviewFailed(InvalidMargonemProfileUrl | MissingMargonemProfileId)
  -> no budget reservation
  -> inline row error

duplicate profile id in pasted batch
  -> per-line PreviewFailed(DuplicateProfileInBatch)
  -> no budget reservation for duplicate occurrence
  -> first occurrence may still proceed if otherwise valid

already owned/shared/unavailable profile
  -> per-line DuplicateMargonemAccountError
  -> no budget reservation
  -> inline row error

budget exhausted while processing valid lines
  -> per-line FirecrawlMonthlyBudgetExhausted
  -> stop fetching remaining valid lines or mark remaining as budget exhausted without Firecrawl calls

Firecrawl failure or parser failure
  -> per-line error
  -> request ledger updated by existing preview service
  -> safe server log

pending import not found/expired/already confirmed
  -> PendingMargonemAccountImportNotFound
  -> ORPC NOT_FOUND or CONFLICT
  -> UI asks user to preview again

unique profile race on confirm
  -> DuplicateMargonemAccountError from transaction/unique constraint classification
  -> ORPC CONFLICT
  -> UI marks preview stale and invalidates owned accounts list
```

### Retry / Cancellation / Idempotency Flow

- Batch preview accepts a caller-owned `AbortSignal` and forwards it to `PreviewMargonemProfileImport.preview`.
- Batch fetching uses bounded concurrency (`2`) because the collection is user-sized and Firecrawl is scarce.
- Do not hold a DB transaction while calling Firecrawl.
- Pending import confirmation is retry-safe after success by returning a typed “not found/already confirmed” failure if the same pending import is submitted again. The UI should invalidate and show the saved account from the list.
- Account creation uses the unique `profile_id` constraint as the final idempotency/concurrency guard.
- React Query should not automatically retry confirmation mutations. Query defaults already retry queries once; mutation behavior should be explicit if needed.

### Observability Flow

Safe fields:

```ts
type SquadBuilderImportLogFields = {
  readonly operation:
    | "previewOwnedAccountImports"
    | "confirmOwnedAccountImport"
    | "listOwnedAccounts";
  readonly actorUserId?: string;
  readonly profileId?: number;
  readonly pendingImportId?: number;
  readonly lineNumber?: number;
  readonly errorTag?: string;
};
```

Log only at router/service boundaries when a typed failure represents dependency or unexpected operational trouble. Avoid logging user typo errors such as invalid URL lines as errors.

Never log:

- raw pasted batch;
- raw profile URL;
- Firecrawl API key;
- raw HTML;
- arbitrary `cause` serialization.

## UI Design Notes

The Accounts page is a product workflow, not a marketing screen.

Recommended layout:

```txt
Page header: "Konta Margonem"
  helper: "Importuj własne konta i używaj postaci z Jaruny przy budowaniu składów."

Two-column desktop layout:
  left/main: Import panel
  right/side: Owned accounts summary/list

Mobile:
  stacked sections, import first, list second
```

Import panel states:

- Empty: textarea plus short instructions.
- Preview pending: textarea disabled, button loading, skeleton rows or compact loading state.
- Results: row per pasted non-blank line with status, profile id/name, character count, editable display name for successes, and confirm action.
- Partial failure: keep successful rows actionable and failed rows readable.

Accessibility requirements:

- Textarea has a visible label, not placeholder-only instructions.
- Per-line errors are text, not color-only.
- Confirm buttons include account name/profile id in accessible label where needed.
- Use native links for generated profile URLs with `target="_blank" rel="noopener"`.
- Loading states must disable duplicate submission controls.

Polish copy examples:

```txt
Textarea label: "Linki do profili"
Textarea helper: "Wklej maksymalnie 20 linków, po jednym w wierszu."
Preview button: "Sprawdź konta"
Confirm button: "Zapisz konto"
Owned list title: "Twoje konta"
Empty owned list: "Nie masz jeszcze zapisanych kont. Wklej link do profilu, aby dodać postacie z Jaruny."
Duplicate line: "Ten profil już występuje wyżej w liście."
Budget exhausted: "Limit pobierania profili na ten miesiąc został wyczerpany."
Expired pending import: "Podgląd wygasł. Sprawdź konto ponownie."
```

## Files to Add / Change / Delete

### Add

```txt
packages/api/src/modules/squad-builder/account-display-name.ts
```

Owns `AccountDisplayName` parser.

```txt
packages/api/src/modules/squad-builder/pending-margonem-account-import-id.ts
```

Owns pending import id parser.

```txt
packages/api/src/modules/squad-builder/preview-owned-account-imports.ts
```

Batch preview Service Module.

```txt
packages/api/src/modules/squad-builder/confirm-owned-account-import.ts
```

Confirm/save Service Module.

```txt
packages/api/src/modules/squad-builder/list-owned-margonem-accounts.ts
```

Owned accounts listing Service Module.

```txt
packages/api/src/modules/squad-builder/account-display-name.test.ts
packages/api/src/modules/squad-builder/preview-owned-account-imports.test.ts
packages/api/src/modules/squad-builder/confirm-owned-account-import.test.ts
```

Focused behavior tests through public service interfaces and recording fakes.

```txt
apps/web/src/routes/dashboard/squad-builder/accounts.tsx
apps/web/src/pages/dashboard/squad-builder/accounts.tsx
```

Accounts page route and UI.

### Change

```txt
packages/db/src/schema/squad-builder.ts
```

Add pending import preview tables and export them in `squadBuilder`.

```txt
packages/db/src/types.ts
```

Export inferred select models for pending import tables.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Extend Drizzle adapter with pending import creation/confirmation and owned account list methods.

```txt
packages/api/src/routers/squad-builder.ts
```

Add batch preview, confirm, and list endpoints with typed error translation.

```txt
packages/api/src/modules/squad-builder/preview-margonem-profile-import.ts
```

Optionally keep unchanged. If reused by batch service, ensure it exposes enough output to create pending imports and does not require client trust.

```txt
packages/api/src/test/integration/database.ts
```

Truncate new pending import tables in test cleanup.

```txt
apps/web/src/components/sidebar/app-sidebar.tsx
```

Add squad-builder/accounts navigation.

```txt
apps/web/src/routeTree.gen.ts
```

Regenerate through the project's TanStack Router tooling if this file is generated by route creation.

### Delete

None.

## RGR TDD Test Plan

Use vertical red-green-refactor slices. Do not write all tests first.

### 1. Parse account display names

RED:

```ts
it("trims and accepts a non-empty account display name", () => {});
it("rejects empty and overlong account display names", () => {});
```

GREEN: implement `account-display-name.ts`.

### 2. Batch parser rejects empty and oversized batches before adapters

RED:

```ts
it("rejects an empty profile URL batch before lookup or Firecrawl", async () => {});
it("rejects batches above the configured max before lookup or Firecrawl", async () => {});
```

GREEN: implement batch service input policy.

### 3. Duplicate pasted profile ids do not spend Firecrawl budget

RED:

```ts
it("marks later duplicate profile URLs in the same batch without reserving budget", async () => {});
```

Use recording fake account lookup, ledger, Firecrawl, and pending import store. Assert only first unique profile can reach preview.

GREEN: parse all lines and detect duplicate profile ids before fetching.

### 4. Already-owned/shared/unavailable profiles do not fetch

RED:

```ts
it("returns per-line duplicate account errors before reserving budget", async () => {});
```

GREEN: batch service checks `findProfileAccessState` before Firecrawl.

### 5. Successful batch preview creates pending imports

RED:

```ts
it("stores a pending import for each successful preview", async () => {});
```

Use a fake single-preview service returning Jaruna characters and a recording pending import store.

GREEN: call `createPendingImport` for success items and return pending ids.

### 6. Confirmation rejects invalid display name before DB write

RED:

```ts
it("rejects an invalid display name before loading the pending import", async () => {});
```

GREEN: implement `ConfirmOwnedAccountImport` parser order.

### 7. Confirmation saves account and characters from pending import

RED:

```ts
it("confirms a pending import into an owned account summary", async () => {});
```

Use recording fake pending import store and account writer.

GREEN: implement confirm service orchestration.

### 8. Drizzle integration: pending import confirm is transactional

RED:

```ts
it("inserts an owned account and its Jaruna characters from a pending import in one transaction", async () => {});
```

Use the existing real Postgres integration harness. Verify through `DrizzleSquadBuilderStore` service-facing methods, not direct table assertions unless no read method exists yet.

GREEN: implement store methods and persistence projections.

### 9. Drizzle integration: duplicate profile race is classified

RED:

```ts
it("returns duplicate account failure when confirming a pending import for an already saved profile", async () => {});
```

GREEN: classify unique constraint/select conflict as `MargonemAccountAlreadyOwnedByActor` or `MargonemAccountOwnedByAnotherUser` based on owner.

### 10. Owned accounts list returns only actor-owned accounts with character counts

RED:

```ts
it("lists only the actor's owned accounts with generated profile links and character counts", async () => {});
```

GREEN: implement `listOwnedAccounts` store/service/router path.

### 11. Router integration: batch preview returns per-line success and errors

RED:

```ts
it("returns per-line owned account import preview results for a verified user", async () => {});
```

Use router composition seams where possible to avoid real Firecrawl. If the current router cannot inject the batch service cleanly, add `createSquadBuilderRouter` options for the new services as with `previewService`.

GREEN: add ORPC endpoint and projections.

### 12. Router integration: confirm import and list accounts

RED:

```ts
it("confirms a pending import and lists it as an owned account", async () => {});
```

Use real Postgres and fake preview/pending setup through store methods.

GREEN: complete router/service/store wiring.

### 13. Frontend behavior: Accounts page renders empty, preview, partial error, and saved states

RED:

```ts
it("lets the user preview pasted URLs, edit display names, confirm valid accounts, and see the owned list update", async () => {});
```

Use the app's established React test setup if present. If no frontend test harness exists, defer automated UI coverage and rely on API integration plus type checks, then note the coverage gap.

GREEN: implement route/page with ORPC mutations and list query.

## Risks and Open Questions

1. **Pending import storage is new scope for Slice 2.** It is recommended to avoid confirmation refetches and client-trusted character payloads. If product explicitly rejects pending storage, the fallback must choose between extra Firecrawl spend or weaker data integrity.
2. **Pending import cleanup is deferred.** Expired rows are ignored by confirmation. A later maintenance task should delete expired pending previews.
3. **Frontend test precedent may be limited.** If there is no established React component/integration test setup, Slice 2 should still include API/service/integration tests and document the UI automation gap.
4. **Batch size and concurrency are policy choices.** This spec recommends max 20 URLs and Firecrawl concurrency 2. Tune only with explicit product/operational reason.
5. **ORPC cancellation propagation from the browser may be limited.** Service seams should accept `AbortSignal`; the router should pass it only if ORPC exposes one in the handler context.

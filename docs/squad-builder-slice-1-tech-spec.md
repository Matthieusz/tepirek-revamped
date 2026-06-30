# Squad Builder Slice 1 Tech Spec

## Summary

Build the backend foundation for Squad Builder slice 1:

- Drizzle schema for Margonem accounts, characters, account access, squad groups, squads, squad characters, squad group invitations, and Firecrawl request usage.
- Domain parsers for Margonem profile URLs and numeric profile ids.
- Firecrawl SDK-backed Margonem profile HTML fetcher.
- HTML parser based on the `test-scrape.json` fixture.
- Jaruna-only character projection.
- Backend preview endpoint for validating/fetching one profile without saving it yet.

This slice does not build the Accounts UI or save imported accounts through a user confirmation flow. It creates the contracts and backend path that Slice 2 will call.

## Context / Current State

The app currently has:

- API package: `packages/api`
- DB package: `packages/db`
- ORPC routers in `packages/api/src/routers`
- BetterAuth session in `context.session.user.id`
- Drizzle Postgres schemas in `packages/db/src/schema`
- Integration tests through ORPC router clients and a real Postgres test DB
- `evlog` request logging through `context.logger`

The feature plan lives in `docs/squad-builder-plan.md`.

Important Firecrawl context from the plan:

- Firecrawl is the main scrape tool.
- Use canonical Margonem profile URLs: `https://www.margonem.pl/profile/view,<profileId>`.
- Do not include character anchors in Firecrawl requests.
- Firecrawl has a 1000 requests/month limit.
- Validate duplicates before spending Firecrawl requests.
- Store normalized data; do not store raw profile URLs or character links.

`test-scrape.json` confirms Firecrawl HTML output includes:

```ts
type FirecrawlFixtureShape = {
  readonly metadata: {
    readonly sourceURL: string;
    readonly url: string;
    readonly statusCode: number;
    readonly contentType: string;
    readonly cacheState?: string;
    readonly creditsUsed?: number;
  };
  readonly html: string;
};
```

Character rows are visible as `li.char-row` with useful fields in HTML attributes and child spans.

## Goals

- Add persistence schema for Slice 1 and later squad-builder slices.
- Parse Margonem profile URLs into branded numeric profile ids.
- Generate profile links from stored profile ids.
- Fetch profile HTML through Firecrawl only after duplicate/budget checks pass.
- Parse account name and Jaruna characters from Firecrawl HTML.
- Return preview data for future import UI.
- Record Firecrawl usage in a request ledger.
- Fail safely when the monthly Firecrawl budget is exhausted.
- Log Firecrawl/fetch/parser failures with safe fields.

## Non-Goals

- No frontend Accounts page.
- No confirmed account save flow.
- No account sharing behavior.
- No manual refetch diff behavior.
- No squad group builder behavior beyond schema foundation.
- No global squad group visibility behavior beyond schema foundation.
- No comments.
- No direct server-side scraping fallback unless explicitly added later.

## Invariants

```ts
type SquadBuilderSliceOneInvariant =
  | "MargonemProfileId uniquely identifies a Margonem account"
  | "Profile links are generated from MargonemProfileId, not stored"
  | "Character links are generated when needed, not stored"
  | "Only Jaruna characters are returned by profile preview"
  | "Only Jaruna characters are stored in margonem_characters"
  | "Firecrawl requests are never made before duplicate import validation"
  | "Firecrawl requests are never made after monthly app budget exhaustion"
  | "One Firecrawl request is recorded for every attempted Firecrawl scrape"
  | "The same Margonem profile id cannot be owned by two app users";
```

## Design Constraints

- Use Firecrawl as the main scrape tool.
- Keep Firecrawl credits scarce: 1000 requests/month provider limit.
- Prefer one request per unique profile id.
- Deduplicate duplicate profile ids inside one request before fetching.
- Do not fetch on ordinary views or squad-builder interactions.
- Keep framework/ORPC input at router boundaries; pass parsed values into service modules.
- Treat Firecrawl responses and DB rows as boundary input.
- Use typed expected failures locally; ORPC errors are boundary translation.
- Do not log raw HTML, raw request bodies, or arbitrary thrown causes.

## Alternatives Considered

### Option 1: Router-owned Firecrawl fetch and parsing

Router parses URL, checks DB, calls Firecrawl, parses HTML, and returns preview.

```txt
ORPC router -> db -> Firecrawl fetch -> HTML parser -> response
```

Pros:

- Fewer files.
- Similar to some existing simple routers.

Cons:

- Router owns too many responsibilities.
- Parser/fetcher are harder to reuse for refetch in Slice 4.
- Firecrawl budget policy is easy to bypass later.
- Tests become route-coupled.

### Option 2: Service module with Firecrawl and persistence adapters

Router parses protocol shape and session, then calls a service module. The service module coordinates duplicate checks, budget reservation, Firecrawl scrape, HTML parsing, and ledger recording through narrow adapters.

```txt
ORPC router -> PreviewMargonemProfileImport service -> store + Firecrawl adapter + HTML parser
```

Pros:

- Firecrawl budget policy has one owner.
- Parser can be fixture-tested independently.
- Later import save and refetch can reuse the same fetch/parser path.
- Persistence and Firecrawl are real seams for tests.

Cons:

- More files than simple router code.

### Option 3: Firecrawl-first batch job, no router preview

Create only a backend job-like module that fetches profiles from internal calls. Slice 2 would add router/UI later.

Pros:

- Keeps Slice 1 fully backend-only.

Cons:

- No public app seam to test through.
- Slice 2 would still need to design API contracts.
- Less useful as a first vertical tracer bullet.

## Recommendation

Use **Option 2**.

The real boundaries are Firecrawl, HTML parsing, persistence, auth/session, and ORPC. A service module plus external adapters keeps invariants local and makes Firecrawl request budget protection hard to bypass.

## Proposed Design

Add a `squadBuilder.previewProfileImport` ORPC endpoint for Slice 1. It validates and fetches one profile, returns a preview, and does not save the account.

```ts
type PreviewProfileImportRequestDto = {
  readonly profileUrl: string;
};

type PreviewProfileImportResponseDto = {
  readonly profileId: number;
  readonly generatedProfileUrl: string;
  readonly suggestedAccountName: string;
  readonly lastFetchedAt: string;
  readonly firecrawlCreditsUsed: number;
  readonly jarunaCharacters: ReadonlyArray<{
    readonly characterId: number;
    readonly name: string;
    readonly level: number;
    readonly profession: string;
    readonly avatarUrl: string | null;
  }>;
};
```

The endpoint is protected by `verifiedProcedure` because importing accounts affects guild-critical shared planning data and consumes a scarce monthly Firecrawl budget.

## Domain Model and Types

```ts
type Brand<TValue, TName extends string> = TValue & {
  readonly __brand: TName;
};

export type AppUserId = Brand<string, "AppUserId">;
export type MargonemProfileId = Brand<number, "MargonemProfileId">;
export type MargonemCharacterId = Brand<number, "MargonemCharacterId">;
export type PositiveLevel = Brand<number, "PositiveLevel">;
export type FirecrawlCreditCount = Brand<number, "FirecrawlCreditCount">;
export type FirecrawlYearMonth = Brand<string, "FirecrawlYearMonth">; // YYYY-MM

export type MargonemWorld = "jaruna";

export type MargonemProfession =
  | "warrior"
  | "paladin"
  | "bladeDancer"
  | "mage"
  | "hunter"
  | "tracker";

export type MargonemCharacterPreview = {
  readonly characterId: MargonemCharacterId;
  readonly name: string;
  readonly level: PositiveLevel;
  readonly profession: MargonemProfession;
  readonly world: MargonemWorld;
  readonly avatarUrl: string | null;
};

export type ParsedMargonemProfile = {
  readonly profileId: MargonemProfileId;
  readonly suggestedAccountName: string;
  readonly jarunaCharacters: ReadonlyArray<MargonemCharacterPreview>;
};
```

Profession normalization is owned by the HTML parser:

```ts
const professionLabels = {
  Wojownik: "warrior",
  Paladyn: "paladin",
  "Tancerz ostrzy": "bladeDancer",
  Mag: "mage",
  Łowca: "hunter",
  Tropiciel: "tracker",
} as const satisfies Record<string, MargonemProfession>;
```

## Types, Interfaces, and APIs

### Result shape

Use the repo's local result style if one exists when implementing. If no shared result exists, keep a local minimal result in the squad-builder module.

```ts
export type Result<TValue, TError> =
  | { readonly _tag: "ok"; readonly value: TValue }
  | { readonly _tag: "err"; readonly error: TError };
```

### Profile URL domain module

```ts
export type ParseMargonemProfileUrlError =
  | {
      readonly _tag: "InvalidMargonemProfileUrl";
      readonly message: string;
    }
  | {
      readonly _tag: "MissingMargonemProfileId";
      readonly message: string;
    };

/** Parse a Margonem profile URL and return the canonical numeric profile id. */
export function parseMargonemProfileUrl(
  input: string
): Result<MargonemProfileId, ParseMargonemProfileUrlError>;

/** Build the canonical Margonem profile URL used for Firecrawl and outbound links. */
export function toMargonemProfileUrl(profileId: MargonemProfileId): string;
```

Accepted:

```ts
parseMargonemProfileUrl("https://www.margonem.pl/profile/view,7298897");
parseMargonemProfileUrl(
  "https://www.margonem.pl/profile/view,7298897#char_1296625,jaruna"
);
```

Rejected:

```ts
parseMargonemProfileUrl("https://example.com/profile/view,7298897");
parseMargonemProfileUrl("https://www.margonem.pl/profile/view,abc");
```

### Firecrawl config

```ts
export type FirecrawlConfig = {
  readonly apiKey: string;
  readonly monthlyRequestBudget: number; // must be <= 1000
};

export type ParseFirecrawlConfigError = {
  readonly _tag: "InvalidFirecrawlConfig";
  readonly message: string;
};
```

Environment variables:

```txt
FIRECRAWL_API_KEY=...
FIRECRAWL_MONTHLY_REQUEST_BUDGET=900
```

`FIRECRAWL_MONTHLY_REQUEST_BUDGET` must be `<= 1000`. The recommended default is `900` to leave manual/debug headroom.

### Firecrawl SDK client seam

```ts
export type FirecrawlScrapeRequest = {
  readonly url: string;
  readonly formats: readonly ["html"];
};

export type FirecrawlScrapeSuccess = {
  readonly html: string;
  readonly metadata: {
    readonly sourceURL?: string;
    readonly url?: string;
    readonly statusCode?: number;
    readonly contentType?: string;
    readonly cacheState?: string;
    readonly creditsUsed?: number;
  };
};

export type FirecrawlScrapeError =
  | {
      readonly _tag: "FirecrawlRequestFailed";
      readonly profileId: MargonemProfileId;
      readonly cause: unknown;
    }
  | {
      readonly _tag: "FirecrawlRejectedRequest";
      readonly profileId: MargonemProfileId;
      readonly statusCode: number;
      readonly message: string;
    }
  | {
      readonly _tag: "FirecrawlResponseNotParseable";
      readonly profileId: MargonemProfileId;
      readonly cause: unknown;
    };

export interface FirecrawlClient {
  scrapeProfileHtml(
    profileId: MargonemProfileId,
    options?: { readonly signal?: AbortSignal }
  ): Promise<Result<FirecrawlScrapeSuccess, FirecrawlScrapeError>>;
}
```

The production implementation uses the Firecrawl SDK and sends the canonical profile URL only:

```ts
const request = {
  url: toMargonemProfileUrl(profileId),
  formats: ["html"],
} satisfies FirecrawlScrapeRequest;

await firecrawl.scrape(request.url, { formats: [...request.formats] });
```

The SDK instance is created inside the External Adapter Module/composition root. Service modules depend only on the `FirecrawlClient` seam, not on SDK types.

### HTML parser

```ts
export type ParseMargonemProfileHtmlInput = {
  readonly profileId: MargonemProfileId;
  readonly html: string;
};

export type ParseMargonemProfileHtmlError =
  | {
      readonly _tag: "MargonemProfileNameNotFound";
      readonly profileId: MargonemProfileId;
    }
  | {
      readonly _tag: "MargonemCharacterRowsNotFound";
      readonly profileId: MargonemProfileId;
    }
  | {
      readonly _tag: "MargonemCharacterRowInvalid";
      readonly profileId: MargonemProfileId;
      readonly safeReason: string;
    };

/** Parse Firecrawl HTML into a Jaruna-only profile preview. */
export function parseMargonemProfileHtml(
  input: ParseMargonemProfileHtmlInput
): Result<ParsedMargonemProfile, ParseMargonemProfileHtmlError>;
```

Parser rules from `test-scrape.json`:

```ts
type CharacterRowHtmlContract = {
  readonly rowSelector: "li.char-row";
  readonly characterIdAttribute: "data-id";
  readonly nameAttribute: "data-nick";
  readonly levelAttribute: "data-lvl";
  readonly worldAttribute: "data-world"; // Jaruna is #jaruna
  readonly professionSelector: ".character-prof";
  readonly avatarSelector: ".cimg";
  readonly avatarSource: "inline background-image url(...)";
};
```

Projection:

```txt
li.char-row[data-world="#jaruna"]
  -> data-id as MargonemCharacterId
  -> data-nick trimmed as name
  -> data-lvl as PositiveLevel
  -> .character-prof text, trim trailing comma, normalize Polish label
  -> .cimg style background-image url as avatarUrl | null
```

### Firecrawl budget and request ledger seam

```ts
export type FirecrawlRequestStatus =
  | "reserved"
  | "succeeded"
  | "failed"
  | "skipped_budget_exhausted";

export type FirecrawlBudgetState = {
  readonly yearMonth: FirecrawlYearMonth;
  readonly monthlyRequestBudget: number;
  readonly usedRequests: number;
  readonly remainingRequests: number;
};

export type FirecrawlBudgetError =
  | {
      readonly _tag: "FirecrawlMonthlyBudgetExhausted";
      readonly yearMonth: FirecrawlYearMonth;
      readonly monthlyRequestBudget: number;
      readonly usedRequests: number;
    }
  | SquadBuilderPersistenceUnavailable;

export interface FirecrawlRequestLedger {
  reserveRequest(
    input: ReserveFirecrawlRequestInput
  ): Promise<Result<ReservedFirecrawlRequest, FirecrawlBudgetError>>;

  markRequestSucceeded(
    input: MarkFirecrawlRequestSucceededInput
  ): Promise<Result<void, SquadBuilderPersistenceUnavailable>>;

  markRequestFailed(
    input: MarkFirecrawlRequestFailedInput
  ): Promise<Result<void, SquadBuilderPersistenceUnavailable>>;
}

export type ReserveFirecrawlRequestInput = {
  readonly profileId: MargonemProfileId;
  readonly requestedByUserId: AppUserId;
  readonly yearMonth: FirecrawlYearMonth;
  readonly monthlyRequestBudget: number;
};

export type ReservedFirecrawlRequest = {
  readonly requestId: number;
  readonly budgetState: FirecrawlBudgetState;
};

export type MarkFirecrawlRequestSucceededInput = {
  readonly requestId: number;
  readonly creditsUsed: FirecrawlCreditCount;
  readonly firecrawlStatusCode: number | null;
  readonly cacheState: string | null;
};

export type MarkFirecrawlRequestFailedInput = {
  readonly requestId: number;
  readonly errorTag: string;
};
```

Budget rule:

```txt
usedRequests = count(firecrawl_profile_scrape_requests where year_month = currentMonth and status in ('reserved', 'succeeded', 'failed'))
if usedRequests >= monthlyRequestBudget -> reject before Firecrawl call
else insert reserved request row and continue
```

Reserved rows count as used to avoid concurrent requests overspending the budget.

### Account lookup seam

```ts
export type ProfileAccessState =
  | { readonly _tag: "Available" }
  | { readonly _tag: "OwnedByActor" }
  | { readonly _tag: "OwnedByAnotherUser" }
  | { readonly _tag: "SharedWithActor" };

export interface SquadBuilderAccountLookup {
  findProfileAccessState(
    input: FindProfileAccessStateInput
  ): Promise<Result<ProfileAccessState, SquadBuilderPersistenceUnavailable>>;
}

export type FindProfileAccessStateInput = {
  readonly profileId: MargonemProfileId;
  readonly actorUserId: AppUserId;
};

export type SquadBuilderPersistenceUnavailable = {
  readonly _tag: "SquadBuilderPersistenceUnavailable";
  readonly operation: string;
  readonly cause: unknown;
};
```

### Service module

```ts
export type PreviewMargonemProfileImportInput = {
  readonly actorUserId: AppUserId;
  readonly profileUrl: string;
};

export type PreviewMargonemProfileImportOutput = {
  readonly profileId: MargonemProfileId;
  readonly generatedProfileUrl: string;
  readonly suggestedAccountName: string;
  readonly lastFetchedAt: Date;
  readonly firecrawlCreditsUsed: FirecrawlCreditCount;
  readonly jarunaCharacters: ReadonlyArray<MargonemCharacterPreview>;
};

export type DuplicateMargonemAccountError =
  | { readonly _tag: "MargonemAccountAlreadyOwnedByActor" }
  | { readonly _tag: "MargonemAccountOwnedByAnotherUser" }
  | { readonly _tag: "MargonemAccountAlreadySharedWithActor" };

export type PreviewMargonemProfileImportError =
  | ParseMargonemProfileUrlError
  | DuplicateMargonemAccountError
  | FirecrawlBudgetError
  | FirecrawlScrapeError
  | ParseMargonemProfileHtmlError
  | SquadBuilderPersistenceUnavailable;

export class PreviewMargonemProfileImport {
  constructor(
    private readonly accounts: SquadBuilderAccountLookup,
    private readonly ledger: FirecrawlRequestLedger,
    private readonly firecrawl: FirecrawlClient,
    private readonly clock: Clock,
    private readonly config: FirecrawlConfig
  ) {}

  /** Preview a Margonem profile import without saving the account. */
  async preview(
    input: PreviewMargonemProfileImportInput,
    options?: { readonly signal?: AbortSignal }
  ): Promise<
    Result<
      PreviewMargonemProfileImportOutput,
      PreviewMargonemProfileImportError
    >
  >;
}

export interface Clock {
  now(): Date;
}
```

## Persistence Schema

Add `packages/db/src/schema/squad-builder.ts`.

### Margonem accounts

```ts
export const margonemAccount = pgTable(
  "margonem_accounts",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").notNull(),
    displayName: text("display_name").notNull(),
    ownerUserId: text("owner_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    lastFetchedAt: timestamp("last_fetched_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("margonem_accounts_profile_id_unique").on(table.profileId),
    index("margonem_accounts_owner_user_id_idx").on(table.ownerUserId),
  ]
);
```

### Margonem characters

```ts
export const margonemCharacter = pgTable(
  "margonem_characters",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .references(() => margonemAccount.id, { onDelete: "cascade" })
      .notNull(),
    characterId: integer("character_id").notNull(),
    name: text("name").notNull(),
    level: integer("level").notNull(),
    profession: text("profession").notNull(),
    world: text("world").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("margonem_characters_account_character_unique").on(
      table.accountId,
      table.characterId
    ),
    index("margonem_characters_account_id_idx").on(table.accountId),
  ]
);
```

### Account access foundation

```ts
export const margonemAccountAccess = pgTable(
  "margonem_account_access",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .references(() => margonemAccount.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status").notNull(), // pending | accepted | declined | revoked
    invitedByUserId: text("invited_by_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("margonem_account_access_account_user_unique").on(
      table.accountId,
      table.userId
    ),
    index("margonem_account_access_user_status_idx").on(
      table.userId,
      table.status
    ),
  ]
);
```

### Squad group foundation

```ts
export const squadGroup = pgTable("squad_groups", {
  id: serial("id").primaryKey(),
  ownerUserId: text("owner_user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  visibility: text("visibility").default("private").notNull(), // private | global
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const squad = pgTable(
  "squads",
  {
    id: serial("id").primaryKey(),
    squadGroupId: integer("squad_group_id")
      .references(() => squadGroup.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("squads_group_id_idx").on(table.squadGroupId)]
);

export const squadCharacter = pgTable(
  "squad_characters",
  {
    id: serial("id").primaryKey(),
    squadId: integer("squad_id")
      .references(() => squad.id, { onDelete: "cascade" })
      .notNull(),
    characterId: integer("character_id")
      .references(() => margonemCharacter.id, { onDelete: "cascade" })
      .notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("squad_characters_squad_character_unique").on(
      table.squadId,
      table.characterId
    ),
    index("squad_characters_squad_id_idx").on(table.squadId),
  ]
);
```

Cross-squad-group rules such as "same character only once across all squads in one group" are service/persistence write rules for Slice 5 because they need a join through `squad -> squad_group`.

### Squad group invitations foundation

```ts
export const squadGroupInvitation = pgTable(
  "squad_group_invitations",
  {
    id: serial("id").primaryKey(),
    squadGroupId: integer("squad_group_id")
      .references(() => squadGroup.id, { onDelete: "cascade" })
      .notNull(),
    invitedUserId: text("invited_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    invitedByUserId: text("invited_by_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status").notNull(), // pending | accepted | declined | revoked
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("squad_group_invitations_group_user_unique").on(
      table.squadGroupId,
      table.invitedUserId
    ),
    index("squad_group_invitations_user_status_idx").on(
      table.invitedUserId,
      table.status
    ),
  ]
);
```

### Firecrawl request ledger

```ts
export const firecrawlProfileScrapeRequest = pgTable(
  "firecrawl_profile_scrape_requests",
  {
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").notNull(),
    requestedByUserId: text("requested_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    yearMonth: text("year_month").notNull(),
    status: text("status").notNull(),
    creditsUsed: integer("credits_used"),
    firecrawlStatusCode: integer("firecrawl_status_code"),
    cacheState: text("cache_state"),
    errorTag: text("error_tag"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("firecrawl_scrape_year_month_status_idx").on(
      table.yearMonth,
      table.status
    ),
    index("firecrawl_scrape_profile_id_idx").on(table.profileId),
  ]
);
```

## Seams, Boundaries, Adapters, and Implementations

### Domain modules

```txt
packages/api/src/modules/squad-builder/margonem-profile-id.ts
packages/api/src/modules/squad-builder/margonem-profile-url.ts
packages/api/src/modules/squad-builder/margonem-character.ts
packages/api/src/modules/squad-builder/firecrawl-year-month.ts
```

Own brands, parsers, and domain formatting.

### HTML parser module

```txt
packages/api/src/modules/squad-builder/margonem-profile-html-parser.ts
```

Owns Firecrawl HTML parsing. It sees raw HTML. Service modules only see `ParsedMargonemProfile`.

### External adapter module

```txt
packages/api/src/modules/squad-builder/firecrawl-client.ts
```

Owns Firecrawl SDK calls, response parsing, and exception classification.

### Persistence adapter module

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Owns Drizzle queries for duplicate state and Firecrawl request ledger updates.

### Service module

```txt
packages/api/src/modules/squad-builder/preview-margonem-profile-import.ts
```

Owns orchestration and policy:

1. parse profile URL;
2. duplicate/access check;
3. reserve Firecrawl budget;
4. call Firecrawl;
5. record success/failure;
6. parse HTML;
7. return preview.

### Router boundary

```txt
packages/api/src/routers/squad-builder.ts
```

Owns ORPC input/output DTOs and ORPC error translation.

## Call Stacks and Data Flow

### Current / Old Flow

No current squad-builder backend flow exists.

### Proposed / New Flow

```txt
raw ORPC input { profileUrl: string }
  -> zod request DTO parser
  -> BetterAuth session from verifiedProcedure
  -> AppUserId parser for context.session.user.id
  -> PreviewMargonemProfileImport.preview({ actorUserId, profileUrl })
  -> parseMargonemProfileUrl(profileUrl)
  -> SquadBuilderStore.findProfileAccessState({ profileId, actorUserId })
  -> if Available:
       FirecrawlYearMonth.fromDate(clock.now())
  -> SquadBuilderStore.reserveRequest({ profileId, actorUserId, yearMonth, budget })
  -> FirecrawlClient.scrapeProfileHtml(profileId, { signal })
  -> Firecrawl SDK scrape call with canonical profile URL and formats: ['html']
  -> FirecrawlScrapeSuccess { html, metadata }
  -> SquadBuilderStore.markRequestSucceeded({ requestId, creditsUsed, statusCode, cacheState })
  -> parseMargonemProfileHtml({ profileId, html })
  -> ParsedMargonemProfile with Jaruna-only characters
  -> PreviewMargonemProfileImportOutput
  -> router protocol projection
  -> ORPC response DTO
```

### Failure Flow

```txt
invalid URL
  -> InvalidMargonemProfileUrl | MissingMargonemProfileId
  -> ORPC BAD_REQUEST

profile already owned by actor
  -> MargonemAccountAlreadyOwnedByActor
  -> no Firecrawl request
  -> ORPC CONFLICT

profile owned by another user
  -> MargonemAccountOwnedByAnotherUser
  -> no Firecrawl request
  -> ORPC CONFLICT

profile already shared with actor
  -> MargonemAccountAlreadySharedWithActor
  -> no Firecrawl request
  -> ORPC CONFLICT

monthly Firecrawl budget exhausted
  -> FirecrawlMonthlyBudgetExhausted
  -> no Firecrawl request
  -> ORPC TOO_MANY_REQUESTS

Firecrawl request fails/rejects/unparseable response
  -> FirecrawlScrapeError
  -> mark request failed when reservation exists
  -> log safe fields
  -> ORPC BAD_GATEWAY

HTML parser fails
  -> ParseMargonemProfileHtmlError
  -> Firecrawl request remains succeeded because the paid scrape succeeded
  -> log safe fields
  -> ORPC BAD_GATEWAY

DB failure
  -> SquadBuilderPersistenceUnavailable
  -> log safe fields
  -> ORPC INTERNAL_SERVER_ERROR
```

### Retry / Cancellation / Idempotency Flow

- Preview is read-only except for Firecrawl ledger writes.
- Duplicate/access validation happens before budget reservation.
- Budget reservation happens before Firecrawl call.
- Reserved requests count against the monthly app budget to avoid concurrent overspend.
- Retrying the same preview may consume another Firecrawl request unless a later cache/recent-preview policy is added. Slice 1 does not introduce preview-result caching beyond the request ledger.
- `AbortSignal` is accepted by service/client. If the Firecrawl SDK supports cancellation, pass it through; otherwise check cancellation before and after the SDK call and document the limitation in the adapter.
- If cancellation happens after reservation but before Firecrawl completes, mark request as failed with `errorTag = "RequestCancelled"` if the call path can observe it.
- Do not hold DB transactions while calling Firecrawl.

### Observability Flow

Safe logging fields:

```ts
type SquadBuilderLogFields = {
  readonly operation: "previewMargonemProfileImport";
  readonly profileId?: number;
  readonly errorTag?: string;
  readonly firecrawlRequestId?: number;
  readonly yearMonth?: string;
};
```

Log examples:

```ts
context.logger.error("Squad builder profile preview failed", {
  operation: "previewMargonemProfileImport",
  profileId: MargonemProfileId.toNumber(profileId),
  errorTag: error._tag,
  firecrawlRequestId: requestId,
});
```

Do not log:

- raw profile URL;
- Firecrawl API key;
- raw HTML;
- arbitrary `cause` serialization;
- request body.

## Files to Add / Change / Delete

### Add

```txt
packages/db/src/schema/squad-builder.ts
```

Owns new Drizzle tables.

```txt
packages/api/src/modules/squad-builder/result.ts
```

Local result type only if no shared result convention is introduced.

```txt
packages/api/src/modules/squad-builder/margonem-profile-id.ts
packages/api/src/modules/squad-builder/margonem-profile-url.ts
packages/api/src/modules/squad-builder/margonem-character.ts
packages/api/src/modules/squad-builder/firecrawl-year-month.ts
```

Domain modules and parsers.

```txt
packages/api/src/modules/squad-builder/margonem-profile-html-parser.ts
```

Parses Firecrawl HTML fixture shape.

```txt
packages/api/src/modules/squad-builder/firecrawl-client.ts
```

Firecrawl External Adapter Module.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Drizzle persistence adapter.

```txt
packages/api/src/modules/squad-builder/preview-margonem-profile-import.ts
```

Service module.

```txt
packages/api/src/routers/squad-builder.ts
```

ORPC endpoint and error translation.

### Change

```txt
packages/db/src/index.ts
```

Include `...squadBuilder` schema in Drizzle schema object.

```txt
packages/db/src/types.ts
```

Export inferred select model types for new tables.

```txt
packages/api/src/routers/index.ts
```

Mount `squadBuilder: squadBuilderRouter`.

```txt
packages/api/src/test/integration/database.ts
```

Add new tables to `applicationTables` truncation list.

```txt
apps/server/.env.example
```

Document Firecrawl env vars.

```txt
packages/api/package.json
```

Add the Firecrawl SDK dependency used by the External Adapter Module.

### Delete

None.

## RGR TDD Test Plan

Use vertical red-green-refactor slices. Do not write all tests first.

### 1. Parse canonical and anchored profile URLs

RED:

```ts
it("extracts the numeric profile id from canonical and anchored Margonem profile URLs", () => {
  expect(
    parseMargonemProfileUrl("https://www.margonem.pl/profile/view,7298897")
  ).toEqual(ok(7298897 as MargonemProfileId));
  expect(
    parseMargonemProfileUrl(
      "https://www.margonem.pl/profile/view,7298897#char_1296625,jaruna"
    )
  ).toEqual(ok(7298897 as MargonemProfileId));
});
```

GREEN: implement profile URL parser.

### 2. Reject invalid profile URLs

RED:

```ts
it("rejects non-Margonem profile URLs before any scrape can happen", () => {});
```

GREEN: return typed parser failure.

### 3. Generate canonical profile URL

RED:

```ts
it("generates the canonical Margonem profile URL from profile id", () => {});
```

GREEN: implement `toMargonemProfileUrl`.

### 4. Parse Firecrawl fixture into Jaruna-only preview

RED:

```ts
it("parses account name and Jaruna character rows from the Firecrawl HTML fixture", () => {});
```

Use `test-scrape.json` as fixture input. Expected Jaruna character ids from the fixture include `1566049`, `1299941`, `1296625`, `1621516`, `1565931`, `1615754`, `1565827`.

GREEN: implement `parseMargonemProfileHtml`.

### 5. Discard non-Jaruna characters

RED:

```ts
it("discards non-Jaruna character rows from the Firecrawl HTML fixture", () => {});
```

GREEN: filter `data-world="#jaruna"` only.

### 6. Classify unsupported HTML

RED:

```ts
it("returns a typed parser failure when profile name or character rows are missing", () => {});
```

GREEN: add parser error variants.

### 7. Enforce Firecrawl budget before scrape

RED:

```ts
it("rejects preview before calling Firecrawl when monthly budget is exhausted", async () => {});
```

Use recording fake `FirecrawlClient` through the service seam.

GREEN: implement ledger `reserveRequest` behavior and service ordering.

### 8. Reject duplicate account before budget reservation/scrape

RED:

```ts
it("does not reserve budget or call Firecrawl when the actor already owns the profile", async () => {});
```

GREEN: implement duplicate-state handling before ledger reservation.

### 9. Preview happy path through service

RED:

```ts
it("returns a Jaruna-only import preview for an available Margonem profile", async () => {});
```

Use fake account lookup, fake ledger, fake Firecrawl client returning fixture HTML, and fixed clock.

GREEN: implement service orchestration.

### 10. Record Firecrawl failure after reservation

RED:

```ts
it("marks the reserved Firecrawl request failed when the scrape fails", async () => {});
```

GREEN: service calls `markRequestFailed` on scrape failure.

### 11. Persistence integration for profile access state

RED:

```ts
it("reports profile access state for available, owned, owned by another user, and shared profiles", async () => {});
```

Use real Postgres integration DB and Drizzle store.

GREEN: implement schema/store queries.

### 12. Router integration preview

RED:

```ts
it("lets a verified user preview a Margonem profile import", async () => {});
```

Use ORPC router client. Avoid real Firecrawl by composing router with a test service/fake Firecrawl seam if the current app router composition allows it; otherwise test the service integration and keep router test limited to auth/input/error translation.

GREEN: mount `squadBuilder.previewProfileImport`.

## Risks and Open Questions

1. **Firecrawl exact API contract**
   - The fixture confirms returned shape, but implementation should verify the exact scrape endpoint/request body against the currently installed Firecrawl API/docs before coding.

2. **Firecrawl SDK dependency must be added**
   - Add the Firecrawl SDK to `packages/api` and keep SDK types inside the External Adapter Module.

3. **HTML parser fragility**
   - Margonem markup can change. Fixture tests protect current behavior but cannot guarantee future compatibility.

4. **Clan data is intentionally out of scope for Slice 1**
   - Do not parse, store, or return clan fields in Slice 1.

5. **Budget threshold exact value**
   - Spec recommends `900` requests/month via `FIRECRAWL_MONTHLY_REQUEST_BUDGET`, hard-capped at `1000`. Product can tune this later.

6. **Preview retry cost**
   - Slice 1 does not cache preview results beyond the ledger. Slice 2 should avoid repeated preview calls by keeping client-side preview state until user confirms save.

7. **ID integer range**
   - Margonem ids in the fixture fit Postgres `integer`. If future ids may exceed that range, switch profile/character ids to `bigint` or text-backed branded values before production use.

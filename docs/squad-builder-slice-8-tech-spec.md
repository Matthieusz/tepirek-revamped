# Squad Builder Slice 8 Tech Spec

## Summary

Make global and shared squad group lists useful by adding server-side filters for:

- squad/group name text;
- character level range.

This slice extends list/read APIs from Slices 6 and 7 with a shared filter contract and adds restrained Polish UI controls on the Squads page. The recommended scope is:

- required: `listGlobalSquadGroups` filters;
- required: `listSharedSquadGroups` filters;
- optional: `listMySquadGroups` may reuse the same filter contract only if it is a small local extension.

No squad editing, visibility, sharing, or import rules change in this slice.

## Context / Current State

Relevant plan: `docs/squad-builder-plan.md`, Slice 8.

Existing/planned foundation:

- Slice 5 adds personal squad groups, squads, placements, save/load, and character metadata including level.
- Slice 6 adds accepted editor access and a shared-with-me list.
- Slice 7 adds global visibility, global list, public read-only detail, and `owner | editor | viewer` access roles.

Slice 7 explicitly defers search/filtering:

```txt
This slice does not add search/filtering. Slice 8 owns filters such as squad name and level range.
```

Current gap:

```txt
Global/shared lists can show recent squad groups,
but users cannot narrow them by name or level range.
As more public/shared groups exist, discovery becomes noisy.
```

## Goals

- Add a shared list filter model for squad group browsing.
- Filter global squad groups by name text and character level range.
- Filter shared-with-me squad groups by name text and character level range.
- Keep all filtering server-side so private groups and unauthorized rows are never sent to the client for filtering.
- Preserve Slice 7 global viewer read-only behavior.
- Preserve Slice 6 editor permissions.
- Use typed parser/domain contracts instead of loose nullable filter bags.
- Keep UI efficient, dark, compact, and Polish.

## Non-Goals

- No full-text search infrastructure.
- No Firecrawl calls or profile refetching.
- No filtering by world; v1 remains Jaruna-only.
- No filtering by profession, account owner, clan, visibility, or editor role.
- No anonymous access.
- No pagination redesign unless the current list query already needs a cursor/limit.
- No changes to squad placement invariants.
- No requirement to filter “my squad groups”; it can be added opportunistically if it reuses the same contract without extra product decisions.

## Invariants

```ts
type SquadGroupFilteringInvariant =
  | "Filters never widen authorization"
  | "Global filters only return globally visible squad groups"
  | "Shared filters only return groups where the actor has an accepted editor grant"
  | "Private groups remain hidden from non-owners/non-editors"
  | "Name query is normalized before persistence access"
  | "Level range uses inclusive min/max bounds"
  | "Level filters match groups containing at least one placed character in range"
  | "Empty filters behave like the existing unfiltered list"
  | "Invalid filter input is rejected at the router boundary before store access";
```

## Design Constraints

- Reuse the existing Drizzle store adapter; do not introduce search infrastructure for two simple filters.
- Keep raw ORPC DTOs at `packages/api/src/routers/squad-builder.ts`.
- Service modules receive parsed `AppUserId` and parsed filter domain values.
- SQL authorization predicates must be part of the filtered query, not applied after fetching rows.
- Level filtering must use stored `margonem_characters.level`; no live profile fetching.
- Query projections should remain list summaries, not full group details.
- Expected failures are typed values and translated to ORPC errors at the router.

## Alternatives Considered

### Option 1: Client-side filtering of fetched lists

Fetch the existing global/shared lists and filter in React.

Pros:

- Smallest backend change.
- Immediate UI iteration.

Cons:

- Only filters the current bounded list, not all matching groups.
- Does not scale as global/shared list grows.
- Encourages over-fetching summaries.
- Makes pagination/cursors incorrect later.

### Option 2: Separate filter endpoints per list

Add dedicated endpoints:

```ts
searchGlobalSquadGroups(input);
searchSharedSquadGroups(input);
```

Pros:

- Clear endpoint names.
- Existing unfiltered endpoints stay unchanged.

Cons:

- Duplicates contracts and UI query wiring.
- Creates two ways to list the same data.
- More router/store surface area for the same behavior.

### Option 3: Add a shared optional filter object to existing list endpoints

Change list endpoints to accept optional filters:

```ts
listGlobalSquadGroups({ filters?: SquadGroupListFiltersDto })
listSharedSquadGroups({ filters?: SquadGroupListFiltersDto })
```

Pros:

- One canonical list path per section.
- Empty filters preserve old behavior.
- Shared parser/service/store contract keeps semantics consistent.
- Future cursor/pagination can compose with the same input.

Cons:

- Existing frontend call sites must pass `{}` or adapt to optional input.
- Store query builders need careful join/exists predicates.

### Option 4: Materialized search/index table

Maintain a denormalized table with group name, squad names, min/max levels, and visibility/access metadata.

Pros:

- Fast reads for large datasets.
- Can support richer future search.

Cons:

- Over-engineered for Slice 8.
- Adds synchronization risk to save/refetch/access cleanup paths.
- Requires extra invalidation whenever squad characters change.

## Recommendation

Use **Option 3: add a shared optional filter object to existing list endpoints**.

This keeps one list API per section, preserves authorization locality in SQL, and is sufficient for name and level range filtering without introducing a new search subsystem.

## Proposed Design

Add a shared filter domain module:

```txt
packages/api/src/modules/squad-builder/squad-group-list-filters.ts
```

Change list APIs from Slices 6 and 7:

```ts
squadBuilder.listGlobalSquadGroups(input?: ListGlobalSquadGroupsDto)
squadBuilder.listSharedSquadGroups(input?: ListSharedSquadGroupsDto)
```

Recommended optional extension:

```ts
squadBuilder.listMySquadGroups(input?: ListMySquadGroupsDto)
```

Frontend behavior:

```txt
Squads page
  -> Publiczne tab: filter bar + global results
  -> Udostępnione mi tab: filter bar + shared results
  -> optional Moje grupy tab: same filter bar if API supports it
```

Filter semantics:

```txt
nameQuery:
  normalized contains match against squad_groups.name
  optionally also against squads.name when already cheap in SQL

level range:
  group matches if at least one placed character in any squad has level >= minLevel and <= maxLevel
```

Open product wording note: the plan says “squad name”, but the UI lists squad groups. This spec recommends matching the group name and, if SQL remains simple, nested squad names too. If implementation must choose one, prefer group name for list discoverability and leave nested squad-name matching as an explicit follow-up.

## Domain Model and Types

### List filters

```ts
export type SquadGroupNameQuery = string & {
  readonly __brand: "SquadGroupNameQuery";
};

export type SquadGroupLevelBound = number & {
  readonly __brand: "SquadGroupLevelBound";
};

export type SquadGroupLevelRange =
  | {
      readonly _tag: "AnyLevel";
    }
  | {
      readonly _tag: "BoundedLevelRange";
      readonly minLevel?: SquadGroupLevelBound;
      readonly maxLevel?: SquadGroupLevelBound;
    };

export type SquadGroupListFilters = {
  readonly nameQuery?: SquadGroupNameQuery;
  readonly levelRange: SquadGroupLevelRange;
};
```

### Filter policy

```ts
export const squadGroupListFilterPolicy = {
  nameQueryMinLength: 2,
  nameQueryMaxLength: 80,
  minAllowedLevel: 1,
  maxAllowedLevel: 500,
  defaultLimit: 50,
} as const;
```

If Margonem level limits are already modeled elsewhere, reuse that `PositiveLevel`/level parser and avoid a duplicate `maxAllowedLevel` policy.

### Filter parsing failures

```ts
export type InvalidSquadGroupNameQuery = {
  readonly _tag: "InvalidSquadGroupNameQuery";
  readonly message: string;
};

export type InvalidSquadGroupLevelRange = {
  readonly _tag: "InvalidSquadGroupLevelRange";
  readonly message: string;
};

export type SquadGroupListFilterError =
  | InvalidSquadGroupNameQuery
  | InvalidSquadGroupLevelRange;
```

### Parser contract

```ts
export type ParseSquadGroupListFiltersInput = {
  readonly nameQuery?: string | null;
  readonly minLevel?: number | null;
  readonly maxLevel?: number | null;
};

export const parseSquadGroupListFilters = (
  input: ParseSquadGroupListFiltersInput
): Result<SquadGroupListFilters, SquadGroupListFilterError>;
```

Parser semantics:

```txt
nameQuery missing/null/blank -> undefined
nameQuery trim + collapse internal whitespace
nameQuery length 1 -> InvalidSquadGroupNameQuery
nameQuery length 2..80 -> branded value
minLevel/maxLevel missing/null -> unbounded on that side
level bounds must be positive integers within allowed policy
minLevel > maxLevel -> InvalidSquadGroupLevelRange
no level bounds -> AnyLevel
```

## Types, Interfaces, and APIs

### Protocol DTOs

```ts
export type SquadGroupListFiltersDto = {
  readonly nameQuery?: string;
  readonly minLevel?: number;
  readonly maxLevel?: number;
};

export type ListGlobalSquadGroupsDto = {
  readonly filters?: SquadGroupListFiltersDto;
};

export type ListSharedSquadGroupsDto = {
  readonly filters?: SquadGroupListFiltersDto;
};

export type ListMySquadGroupsDto = {
  readonly filters?: SquadGroupListFiltersDto;
};
```

Existing response DTOs remain list summaries:

```ts
export type SquadGroupSummaryDto = {
  readonly groupId: number;
  readonly name: string;
  readonly ownerUserName?: string;
  readonly ownerUserImage?: string | null;
  readonly squadCount: number;
  readonly characterCount: number;
  readonly updatedAt: string;
};
```

### Store inputs

```ts
export type ListFilteredGlobalSquadGroupsInput = {
  readonly actorUserId: AppUserId;
  readonly filters: SquadGroupListFilters;
  readonly limit: number;
};

export type ListFilteredSharedSquadGroupsInput = {
  readonly actorUserId: AppUserId;
  readonly filters: SquadGroupListFilters;
  readonly limit: number;
};

export type ListFilteredMySquadGroupsInput = {
  readonly actorUserId: AppUserId;
  readonly filters: SquadGroupListFilters;
  readonly limit: number;
};
```

### Store interface changes

```ts
export interface FilteredSquadGroupListStore {
  readonly listGlobalSquadGroups: (
    input: ListFilteredGlobalSquadGroupsInput
  ) => Promise<
    Result<
      readonly GlobalSquadGroupSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listSharedSquadGroups: (
    input: ListFilteredSharedSquadGroupsInput
  ) => Promise<
    Result<
      readonly SharedSquadGroupSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listMySquadGroups?: (
    input: ListFilteredMySquadGroupsInput
  ) => Promise<
    Result<readonly SquadGroupSummary[], SquadBuilderPersistenceUnavailable>
  >;
}
```

If the codebase already has `SquadGroupSharingStore` and `GlobalSquadVisibilityStore`, extend those existing interfaces rather than creating a standalone runtime object.

### Service modules

```ts
export class ListGlobalSquadGroups {
  constructor(private readonly store: GlobalSquadVisibilityStore) {}

  list(input: {
    readonly actorUserId: AppUserId;
    readonly filters: SquadGroupListFilters;
  }): Promise<
    Result<
      readonly GlobalSquadGroupSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;
}
```

```ts
export class ListSquadGroupSharingState {
  constructor(private readonly store: SquadGroupSharingStore) {}

  listSharedGroups(input: {
    readonly actorUserId: AppUserId;
    readonly filters: SquadGroupListFilters;
  }): Promise<
    Result<readonly SharedSquadGroupSummary[], SquadGroupSharingError>
  >;
}
```

Optional my-groups extension:

```ts
export class ListSquadGroups {
  constructor(private readonly store: SquadGroupStore) {}

  listMine(input: {
    readonly actorUserId: AppUserId;
    readonly filters: SquadGroupListFilters;
  }): Promise<
    Result<readonly SquadGroupSummary[], SquadBuilderPersistenceUnavailable>
  >;
}
```

### Expected failures

```ts
export type SquadGroupFilteredListError =
  | SquadGroupListFilterError
  | SquadBuilderPersistenceUnavailable;
```

No new authorization failure is expected for list endpoints because the query predicate scopes rows by list type. Detail/open operations continue using Slice 6/7 authorization failures.

## Seams, Boundaries, Adapters, and Implementations

### Domain module

```txt
packages/api/src/modules/squad-builder/squad-group-list-filters.ts
```

Owns parsing, normalization, policy, and filter error values.

### Service modules

```txt
packages/api/src/modules/squad-builder/list-global-squad-groups.ts
packages/api/src/modules/squad-builder/list-squad-group-sharing-state.ts
packages/api/src/modules/squad-builder/list-squad-groups.ts
```

Change list methods to accept parsed filters and pass a default empty filter when omitted.

### Persistence adapter

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Owns Drizzle query composition:

```txt
base authorized list predicate
  + optional normalized name predicate
  + optional level exists predicate
  + grouping/count projection
  + updatedAt desc limit
```

### Router boundary

```txt
packages/api/src/routers/squad-builder.ts
```

Owns DTO schema, parsing unknown inputs into `SquadGroupListFilters`, service composition, and error translation.

### Frontend page/components

```txt
apps/web/src/pages/dashboard/squad-builder/squads.tsx
```

Add filter state and pass filters into global/shared list queries.

Optional extraction if the page becomes too large:

```txt
apps/web/src/pages/dashboard/squad-builder/squad-group-list-filters.tsx
```

Keep the component local to squad-builder unless reused elsewhere.

## Call Stacks and Data Flow

### Current / Old Flow

```txt
Publiczne tab mounts
  -> listGlobalSquadGroups()
  -> verified actor
  -> store query where visibility = 'global'
  -> latest bounded global summaries
  -> client renders all returned rows

Udostępnione mi tab mounts
  -> listSharedSquadGroups()
  -> verified actor
  -> store query where accepted editor invitation belongs to actor
  -> latest bounded shared summaries
  -> client renders all returned rows
```

### Proposed / New Flow: Filter Global Groups

```txt
filter form state { nameQuery: 'smoki', minLevel: 120, maxLevel: 180 }
  -> ORPC DTO { filters: { nameQuery, minLevel, maxLevel } }
  -> zod parser accepts optional primitive fields
  -> parseAppUserId(context.session.user.id)
  -> parseSquadGroupListFilters
       nameQuery -> SquadGroupNameQuery
       min/max -> SquadGroupLevelRange
  -> ListGlobalSquadGroups.list({ actorUserId, filters })
  -> store.listGlobalSquadGroups({ actorUserId, filters, limit: 50 })
       where squad_groups.visibility = 'global'
       and name predicate when present
       and exists placed character in inclusive level range when present
       aggregate squadCount/characterCount
       order updatedAt desc
  -> GlobalSquadGroupSummary[]
  -> protocol DTO with ISO dates
  -> Publiczne tab results
```

### Proposed / New Flow: Filter Shared Groups

```txt
filter form state { nameQuery, minLevel, maxLevel }
  -> ORPC DTO { filters }
  -> zod parser
  -> parseAppUserId
  -> parseSquadGroupListFilters
  -> ListSquadGroupSharingState.listSharedGroups({ actorUserId, filters })
  -> store.listSharedSquadGroups({ actorUserId, filters, limit: 50 })
       where squad_group_invitations.invited_user_id = actor
       and squad_group_invitations.status = 'accepted'
       and optional filters
  -> SharedSquadGroupSummary[]
  -> protocol DTO
  -> Udostępnione mi tab results
```

### Proposed / New Flow: Optional Filter My Groups

```txt
Moje grupy filter state
  -> listMySquadGroups({ filters })
  -> parse filters
  -> store.listMySquadGroups
       where squad_groups.owner_user_id = actor
       and optional filters
  -> my group summaries
```

This is optional; do not block Slice 8 on it if global/shared filters are complete.

### Failure Flow

```txt
nameQuery length is 1
  -> InvalidSquadGroupNameQuery
  -> ORPC BAD_REQUEST
  -> UI keeps current form value and shows inline error

minLevel is 0 or non-integer
  -> InvalidSquadGroupLevelRange
  -> ORPC BAD_REQUEST

minLevel > maxLevel
  -> InvalidSquadGroupLevelRange
  -> ORPC BAD_REQUEST

store query fails
  -> SquadBuilderPersistenceUnavailable
  -> ORPC INTERNAL_SERVER_ERROR
  -> UI shows list-level retry state

actor opens a filtered global result after owner made it private
  -> getSquadGroupDetail authorization re-runs
  -> ActorCannotViewSquadGroup
  -> ORPC FORBIDDEN
```

### Retry / Cancellation / Idempotency Flow

- Filter list queries are read-only and idempotent.
- UI should debounce text input before issuing list queries, or apply filters on submit, to avoid query churn.
- Changing filters should cancel/ignore stale client queries through the existing query library behavior.
- No server-side transaction is needed for list reads.
- No Firecrawl/external network call occurs.
- Level/name filters apply at query time and may reflect concurrent saves/refetch cleanups on the next request.

### Observability Flow

Safe fields:

```ts
type SquadGroupFilteringLogFields = {
  readonly operation:
    | "listGlobalSquadGroups"
    | "listSharedSquadGroups"
    | "listMySquadGroups";
  readonly actorUserId?: string;
  readonly hasNameQuery?: boolean;
  readonly hasMinLevel?: boolean;
  readonly hasMaxLevel?: boolean;
  readonly resultCount?: number;
  readonly errorTag?: string;
};
```

Do not log raw `nameQuery` by default because it is user input. Logging booleans and counts is enough for debugging query usage.

## SQL / Projection Strategy

Recommended query shape uses `exists` for level filtering so aggregate counts remain correct:

```ts
const matchesLevelRange = exists(
  db
    .select({ one: sql`1` })
    .from(squad)
    .innerJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
    .innerJoin(
      margonemCharacter,
      eq(margonemCharacter.id, squadCharacter.characterId)
    )
    .where(
      and(
        eq(squad.squadGroupId, squadGroup.id),
        minLevel ? gte(margonemCharacter.level, minLevel) : undefined,
        maxLevel ? lte(margonemCharacter.level, maxLevel) : undefined
      )
    )
);
```

Name predicate should be case-insensitive where Postgres support exists:

```ts
const matchesName = or(
  ilike(squadGroup.name, `%${escapedNameQuery}%`),
  exists(
    db
      .select({ one: sql`1` })
      .from(squad)
      .where(
        and(
          eq(squad.squadGroupId, squadGroup.id),
          ilike(squad.name, `%${escapedNameQuery}%`)
        )
      )
  )
);
```

If project Drizzle helpers do not expose `ilike`, use the local precedent for case-insensitive search. Do not interpolate raw strings into SQL; bind parameters through Drizzle.

## UI Design Notes

Filter bar copy:

```txt
Search label: "Nazwa składu"
Search placeholder: "Szukaj po nazwie…"
Min level label: "Poziom od"
Max level label: "Poziom do"
Submit/apply: "Filtruj"
Clear: "Wyczyść"
```

Empty states:

```txt
No global results: "Brak publicznych składów pasujących do filtrów."
No shared results: "Brak udostępnionych składów pasujących do filtrów."
```

Interaction:

- Keep filters compact above the active list/tab.
- Use numeric inputs for levels.
- Validate obvious min/max mistakes client-side for fast feedback, but keep server validation authoritative.
- Do not hide authorization/permission labels from list cards.
- Preserve read-only copy for global viewer details from Slice 7.

Accessibility:

- Inputs need visible labels, not placeholders only.
- Filter errors should be text associated with the relevant input.
- Results count changes should not rely on color only.

## Files to Add / Change / Delete

### Add

```txt
packages/api/src/modules/squad-builder/squad-group-list-filters.ts
```

Domain parser and filter policy.

```txt
packages/api/src/modules/squad-builder/squad-group-list-filters.test.ts
```

Parser/normalization tests.

Optional frontend extraction:

```txt
apps/web/src/pages/dashboard/squad-builder/squad-group-list-filters.tsx
```

Local filter bar component if `squads.tsx` becomes too large.

### Change

```txt
packages/api/src/modules/squad-builder/list-global-squad-groups.ts
```

Accept `SquadGroupListFilters` and pass them to the store.

```txt
packages/api/src/modules/squad-builder/list-squad-group-sharing-state.ts
```

Accept `SquadGroupListFilters` for `listSharedGroups`.

```txt
packages/api/src/modules/squad-builder/list-squad-groups.ts
```

Optional: accept filters for `listMine` if included.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Add SQL predicates for name and level filters in global/shared list queries.

```txt
packages/api/src/routers/squad-builder.ts
```

Add list input DTO schemas, parse filters, and map filter errors to `BAD_REQUEST`.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.integration.test.ts
```

Add real Postgres tests proving authorization + filters compose correctly.

```txt
apps/web/src/pages/dashboard/squad-builder/squads.tsx
```

Add filter UI and include filters in global/shared query keys/options.

### Delete

None.

## RGR TDD Test Plan

### 1. Parse empty filters as unfiltered

RED:

```ts
it("parses missing squad group list filters as an unfiltered query", () => {});
```

GREEN: implement `parseSquadGroupListFilters` with `AnyLevel` and no `nameQuery`.

### 2. Normalize valid name query

RED:

```ts
it("trims and normalizes a valid squad group name query", () => {});
```

GREEN: trim/collapse whitespace and brand the query.

### 3. Reject invalid name query

RED:

```ts
it("rejects a one-character squad group name query", () => {});
it("rejects an overlong squad group name query", () => {});
```

GREEN: enforce name query policy.

### 4. Parse inclusive level range

RED:

```ts
it("parses an inclusive min and max level range", () => {});
it("parses one-sided level ranges", () => {});
```

GREEN: implement `BoundedLevelRange`.

### 5. Reject invalid level range

RED:

```ts
it("rejects non-integer, out-of-policy, or reversed level ranges", () => {});
```

GREEN: enforce level policy and `min <= max`.

### 6. Global list filters by authorized global rows only

RED:

```ts
it("filters global squad groups without returning private groups", async () => {});
```

Use real Postgres because this proves SQL authorization predicates and filters compose.

GREEN: add filtered global query.

### 7. Global list filters by name

RED:

```ts
it("returns global squad groups whose group or squad name matches the name query", async () => {});
```

GREEN: add case-insensitive name predicate. If nested squad-name matching is deferred, make the assertion group-name only and document the open follow-up.

### 8. Global list filters by level range

RED:

```ts
it("returns global squad groups with at least one placed character in the requested level range", async () => {});
```

GREEN: add `exists` level predicate.

### 9. Shared list filters only accepted editor groups

RED:

```ts
it("filters shared squad groups and excludes pending, declined, revoked, and unrelated groups", async () => {});
```

GREEN: add filtered shared query preserving accepted-invite predicate.

### 10. Shared list combines name and level filters

RED:

```ts
it("requires shared squad groups to match both name and level filters when both are provided", async () => {});
```

GREEN: compose predicates with `and`.

### 11. Router maps filter errors to bad request

RED:

```ts
it("returns BAD_REQUEST for invalid squad group list filters", async () => {});
```

GREEN: add router DTO parsing and error translation.

### 12. Router keeps old unfiltered behavior

RED:

```ts
it("lists global and shared squad groups without filters when input is omitted", async () => {});
```

GREEN: make endpoint input optional and default filters server-side.

### 13. Optional my-groups filtering

RED only if included:

```ts
it("filters my squad groups by name and level range", async () => {});
```

GREEN: extend `listMySquadGroups` with the same filter query helper.

### 14. Frontend behavior: filter bar drives global/shared queries

RED:

```ts
it("updates public and shared squad group results when the user applies filters", async () => {});
```

If no frontend test harness exists, document the UI automation gap and rely on API integration plus type checks.

## Risks and Open Questions

1. **“Squad name” wording is ambiguous.** The plan lists squad groups but names “squad name” as a filter. Recommended behavior is group-name matching first, nested squad-name matching if SQL remains simple. Product should confirm if only nested squad names matter.
2. **Level range semantics.** This spec uses “at least one placed character in range”. Alternative semantics such as all characters in range or average squad level are not specified in the plan.
3. **No full-text search.** `ILIKE`/contains matching is enough for Slice 8. If the dataset grows, add indexed search later with measured evidence.
4. **List size growth.** Existing fixed limit remains acceptable for this slice. Cursor pagination can be added later without changing filter parsing.
5. **Optional my-groups filtering.** The plan says “optionally my squad groups list”; this spec does not require it for acceptance.

# Squad Builder Slice 7 Tech Spec

## Summary

Build global squad group visibility so logged-in users can discover public squad groups.

This slice adds:

- Owner-only visibility toggle: private/global.
- Global squad group list for verified logged-in users.
- Read-only global viewer access to public squad group detail.
- Preservation of editor permissions: explicitly invited editors can still edit a globally visible group.
- Owner ability to make a globally visible group private again.
- Role-aware squad group detail projections: `owner`, `editor`, or `viewer`.

This slice does not add search/filtering. Slice 8 owns filters such as squad name and level range.

## Context / Current State

Relevant plan: `docs/squad-builder-plan.md`, Slice 7.

Existing/planned foundation:

- Slice 5 builds personal squad groups with owner-only editing and a `visibility` column already present on `squad_groups`:

```ts
export const squadGroup = pgTable("squad_groups", {
  id: serial("id").primaryKey(),
  ownerUserId: text("owner_user_id")
    .references(() => user.id, {
      onDelete: "cascade",
    })
    .notNull(),
  name: text("name").notNull(),
  visibility: text("visibility").default("private").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- Slice 6 adds squad group editor invitations and role-aware access:

```ts
type SquadGroupAccessRole = "owner" | "editor";
```

Slice 7 extends that role model with global read-only viewer access.

Current gap:

```txt
Squad groups can be private in storage,
but owners cannot publish them globally,
and logged-in users cannot browse globally visible groups.
```

## Goals

- Let the squad group owner mark a group globally visible.
- Let the squad group owner make a global group private again.
- List globally visible squad groups for every verified logged-in user.
- Let verified logged-in users view globally visible group details read-only.
- Keep global viewers read-only unless they are also accepted editors.
- Preserve owner/editor behavior from Slices 5 and 6.
- Do not leak private squad groups to non-owners/non-editors.

## Non-Goals

- No anonymous/public internet access. “Global” means visible to logged-in verified users.
- No search or filtering; Slice 8.
- No pagination unless needed by implementation constraints. A simple bounded list is acceptable for Slice 7.
- No global comments, likes, copying, favorites, or analytics.
- No changing account/character access rules.
- No editor access from global visibility alone.

## Invariants

```ts
type GlobalSquadVisibilityInvariant =
  | "Only the squad group owner can change visibility"
  | "Global visibility allows verified logged-in users to view a group"
  | "Global visibility does not grant edit permission"
  | "Accepted editors keep editor permission even when the group is global"
  | "Owners keep owner permission regardless of visibility"
  | "Making a group private removes global viewer access"
  | "Private groups remain visible only to owners and accepted editors"
  | "Global list contains only groups with visibility global";
```

## Design Constraints

- Use the existing `squad_groups.visibility` column.
- Model visibility as a domain value, not loose strings throughout services.
- Keep visibility mutations owner-only in service contracts.
- Reuse the Slice 6 role-aware read path and extend it with `viewer`.
- Keep raw ORPC DTOs in the router boundary and pass parsed values into Service Modules.
- Use typed expected failures and translate to ORPC errors at the router.
- UI should extend the existing Squads page/editor, not introduce a separate app shell.

## Alternatives Considered

### Option 1: Visibility flag only in list query

Only add `listGlobalSquadGroups`, and let existing detail endpoint remain owner/editor-only.

Pros:

- Small change.

Cons:

- Global users can discover groups but cannot open details.
- Requires special client behavior and does not satisfy “global viewers are view-only”.

### Option 2: Treat global viewers as editors in the existing role system

Add global groups to editor access checks so everyone can use existing detail/editor endpoints.

Pros:

- Minimal API changes.

Cons:

- Violates read-only global viewer rule.
- Crafted requests could save changes unless every mutation separately rejects global viewers.
- Blurs permission vocabulary.

### Option 3: Extend role-aware access with explicit `viewer`

```ts
type SquadGroupAccessRole = "owner" | "editor" | "viewer";
```

Owners and accepted editors keep their existing roles. Verified users get `viewer` role only when `visibility === "global"`.

Pros:

- Permission model matches product language.
- Global read-only access is explicit in types and UI.
- Existing owner/editor mutation endpoints can keep their strict authorization.
- Future filtering/listing can reuse global projections.

Cons:

- Requires updating detail projections and UI role handling.

## Recommendation

Use **Option 3: explicit viewer role**.

It keeps owner/editor permissions precise and makes global read-only behavior visible in both service contracts and UI rendering.

## Proposed Design

Add APIs under `squadBuilder`:

```ts
squadBuilder.setSquadGroupVisibility(input);
squadBuilder.listGlobalSquadGroups();
```

Change/read APIs from earlier slices:

```ts
squadBuilder.getSquadGroupDetail(input); // now owner | editor | viewer
```

UI changes:

```txt
Squads page
  -> sections/tabs:
       Moje grupy
       Udostępnione mi
       Publiczne
       Zaproszenia

Squad editor/detail page
  -> owner: full controls + visibility toggle
  -> editor: placement editing controls, no visibility controls
  -> viewer: read-only presentation, no save/add/remove controls
```

## Domain Model and Types

### Visibility

```ts
export type SquadGroupVisibility = "private" | "global";

export type InvalidSquadGroupVisibility = {
  readonly _tag: "InvalidSquadGroupVisibility";
};

export const parseSquadGroupVisibility = (
  input: string
): Result<SquadGroupVisibility, InvalidSquadGroupVisibility>;
```

### Access role

Extend Slice 6 access role:

```ts
export type SquadGroupAccessRole = "owner" | "editor" | "viewer";

export type SquadGroupAccess =
  | {
      readonly _tag: "SquadGroupOwnerAccess";
      readonly role: "owner";
      readonly groupId: SquadGroupId;
      readonly ownerUserId: AppUserId;
    }
  | {
      readonly _tag: "SquadGroupEditorAccess";
      readonly role: "editor";
      readonly groupId: SquadGroupId;
      readonly ownerUserId: AppUserId;
      readonly editorUserId: AppUserId;
      readonly invitationId: SquadGroupInvitationId;
    }
  | {
      readonly _tag: "SquadGroupViewerAccess";
      readonly role: "viewer";
      readonly groupId: SquadGroupId;
      readonly ownerUserId: AppUserId;
    };
```

Access precedence:

```txt
owner > accepted editor > global viewer > no access
```

This means if an invited editor views a global group, the API returns `editor`, not `viewer`.

### Global list summary

```ts
export type GlobalSquadGroupSummary = {
  readonly groupId: SquadGroupId;
  readonly name: SquadGroupName;
  readonly ownerUserId: AppUserId;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly squadCount: number;
  readonly characterCount: number;
  readonly updatedAt: Date;
};
```

## Types, Interfaces, and APIs

### Protocol DTOs

```ts
export type SetSquadGroupVisibilityDto = {
  readonly groupId: number;
  readonly visibility: "private" | "global";
};

export type SetSquadGroupVisibilityResponseDto = {
  readonly groupId: number;
  readonly visibility: "private" | "global";
  readonly updatedAt: string;
};

export type ListGlobalSquadGroupsResponseDto = {
  readonly groups: readonly {
    readonly groupId: number;
    readonly name: string;
    readonly ownerUserName: string;
    readonly ownerUserImage: string | null;
    readonly squadCount: number;
    readonly characterCount: number;
    readonly updatedAt: string;
  }[];
};
```

Change existing detail DTO:

```ts
export type SquadGroupDetailDto = {
  readonly accessRole: "owner" | "editor" | "viewer";
  readonly groupId: number;
  readonly name: string;
  readonly visibility: "private" | "global";
  readonly updatedAt: string;
  readonly squads: readonly {
    readonly squadId: number;
    readonly name: string;
    readonly position: number;
    readonly characters: readonly SquadGroupCharacterDto[];
  }[];
};
```

### Expected failures

```ts
export type GlobalSquadVisibilityError =
  | { readonly _tag: "SquadGroupNotFound" }
  | { readonly _tag: "ActorDoesNotOwnSquadGroup" }
  | { readonly _tag: "ActorCannotViewSquadGroup" }
  | InvalidSquadGroupId
  | InvalidSquadGroupVisibility
  | SquadBuilderPersistenceUnavailable;
```

### Store interface

```ts
export interface GlobalSquadVisibilityStore {
  readonly setSquadGroupVisibility: (
    input: SetSquadGroupVisibilityStoreInput
  ) => Promise<
    Result<
      SquadGroupVisibilityChange,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listGlobalSquadGroups: (
    input: ListGlobalSquadGroupsInput
  ) => Promise<
    Result<
      readonly GlobalSquadGroupSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;

  readonly authorizeSquadGroupViewer: (
    input: AuthorizeSquadGroupViewerInput
  ) => Promise<
    Result<
      SquadGroupAccess,
      | SquadGroupNotFound
      | ActorCannotViewSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
}

export type SetSquadGroupVisibilityStoreInput = {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly visibility: SquadGroupVisibility;
  readonly now: Date;
};

export type SquadGroupVisibilityChange = {
  readonly groupId: SquadGroupId;
  readonly visibility: SquadGroupVisibility;
  readonly updatedAt: Date;
};

export type ListGlobalSquadGroupsInput = {
  readonly actorUserId: AppUserId;
  readonly limit: number;
};

export type AuthorizeSquadGroupViewerInput = {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
};
```

`actorUserId` is included in `listGlobalSquadGroups` for consistency and future policy, but the current list returns all global groups to any verified actor.

### Service modules

```ts
export class SetSquadGroupVisibility {
  constructor(
    private readonly store: GlobalSquadVisibilityStore,
    private readonly clock: Clock
  ) {}

  /** Change squad group visibility as the owner. */
  set(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly visibility: SquadGroupVisibility;
  }): Promise<Result<SquadGroupVisibilityChange, GlobalSquadVisibilityError>>;
}
```

```ts
export class ListGlobalSquadGroups {
  constructor(private readonly store: GlobalSquadVisibilityStore) {}

  /** List globally visible squad groups for a verified actor. */
  list(input: {
    readonly actorUserId: AppUserId;
  }): Promise<
    Result<
      readonly GlobalSquadGroupSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;
}
```

Policy:

```ts
const globalSquadGroupsListPolicy = {
  defaultLimit: 50,
} as const;
```

### Detail/read service change

Slice 6 `authorizeSquadGroupViewer` should change from owner/editor-only to:

```txt
if actor is owner -> owner
else if actor has accepted squad group invitation -> editor
else if squadGroup.visibility === 'global' -> viewer
else -> ActorCannotViewSquadGroup
```

Mutation services remain stricter:

```txt
saveSquadGroup -> owner only
saveSharedSquadGroupCharacters -> owner or accepted editor only, not viewer
setSquadGroupVisibility -> owner only
```

## Seams, Boundaries, Adapters, and Implementations

### Domain modules

```txt
packages/api/src/modules/squad-builder/squad-group-visibility.ts
```

Owns visibility parsing and constants.

```txt
packages/api/src/modules/squad-builder/squad-group-access.ts
```

Change to include `viewer` role and access precedence helpers.

### Service modules

```txt
packages/api/src/modules/squad-builder/set-squad-group-visibility.ts
packages/api/src/modules/squad-builder/list-global-squad-groups.ts
```

Own owner-only visibility change and global list behavior.

### Persistence adapter

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Extend existing Drizzle adapter with `GlobalSquadVisibilityStore`; update role-aware detail authorization and global list query.

### Router boundary

```txt
packages/api/src/routers/squad-builder.ts
```

Add endpoints and error translation. Include visibility/access role in projections.

### Frontend pages

```txt
apps/web/src/pages/dashboard/squad-builder/squads.tsx
apps/web/src/pages/dashboard/squad-builder/squad-editor.tsx
```

Add public/global section and owner-only visibility controls; render viewer role read-only.

## Call Stacks and Data Flow

### Current / Old Flow

```txt
Squads page
  -> my groups
  -> shared-with-me groups from accepted editor invites
  -> no public/global section

Group detail
  -> owner/editor can read depending on Slice 6
  -> all other users forbidden

Visibility column
  -> exists but has no product behavior
```

### Proposed / New Flow: Owner Makes Group Global

```txt
owner toggles visibility to global
  -> ORPC DTO { groupId: number, visibility: 'global' }
  -> zod parser
  -> parseAppUserId(context.session.user.id)
  -> parseSquadGroupId(groupId)
  -> parseSquadGroupVisibility('global')
  -> SetSquadGroupVisibility.set({ actorUserId, groupId, visibility })
  -> store.setSquadGroupVisibility
       update squad_groups where id = groupId and owner_user_id = actorUserId
  -> SquadGroupVisibilityChange
  -> protocol DTO
  -> invalidate my groups, global groups, group detail queries
```

### Proposed / New Flow: Owner Makes Group Private

```txt
owner toggles visibility to private
  -> same DTO/parser/service path
  -> update visibility='private'
  -> global list no longer includes group
  -> accepted editors can still access through invitation
  -> non-editor global viewers lose access on next detail/list query
```

### Proposed / New Flow: List Global Squad Groups

```txt
Squads page public section mounts
  -> useQuery(orpc.squadBuilder.listGlobalSquadGroups.queryOptions())
  -> verifiedProcedure ensures logged-in verified actor
  -> parseAppUserId
  -> ListGlobalSquadGroups.list({ actorUserId })
  -> store.listGlobalSquadGroups({ actorUserId, limit: 50 })
       where squad_groups.visibility = 'global'
       join owner user
       aggregate squad count and character count
       order updatedAt desc
  -> protocol DTO
  -> UI public/global groups list
```

### Proposed / New Flow: Global Viewer Opens Detail

```txt
verified actor clicks global group
  -> route /dashboard/squad-builder/squads/$groupId
  -> getSquadGroupDetail({ groupId })
  -> router parser + parseAppUserId
  -> detail service uses store.authorizeSquadGroupViewer
       owner -> role owner
       accepted invite -> role editor
       visibility global -> role viewer
  -> load group detail
  -> protocol DTO includes accessRole='viewer'
  -> UI renders read-only detail, no save/add/remove controls
```

### Failure Flow

```txt
non-owner changes visibility
  -> ActorDoesNotOwnSquadGroup
  -> ORPC FORBIDDEN

nonexistent group visibility change
  -> SquadGroupNotFound
  -> ORPC NOT_FOUND

invalid visibility value
  -> InvalidSquadGroupVisibility
  -> ORPC BAD_REQUEST

private group opened by non-owner/non-editor
  -> ActorCannotViewSquadGroup
  -> ORPC FORBIDDEN

global viewer attempts owner save
  -> ActorDoesNotOwnSquadGroup
  -> ORPC FORBIDDEN

global viewer attempts editor placement save
  -> ActorCannotEditSquadGroup
  -> ORPC FORBIDDEN
```

### Retry / Cancellation / Idempotency Flow

- Setting visibility to the current value is idempotent and returns the current/new visibility with updated timestamp policy chosen by implementation.
- Recommended: update `updatedAt` only when the visibility actually changes.
- Global list is read-only and can use normal React Query retry.
- No Firecrawl/external calls occur.
- Detail queries reflect the current visibility at query time; making a group private immediately removes global viewer access on the next request.

### Observability Flow

Safe fields:

```ts
type GlobalSquadVisibilityLogFields = {
  readonly operation:
    | "setSquadGroupVisibility"
    | "listGlobalSquadGroups"
    | "getSquadGroupDetail";
  readonly actorUserId?: string;
  readonly squadGroupId?: number;
  readonly visibility?: SquadGroupVisibility;
  readonly accessRole?: SquadGroupAccessRole;
  readonly errorTag?: string;
};
```

Log persistence failures and visibility changes with safe fields. Do not log full squad details or character lists.

## UI Design Notes

Squads page additions:

```txt
Section/tab: "Publiczne"
Empty state: "Nie ma jeszcze publicznych składów."
```

Owner visibility control in editor:

```txt
Label: "Widoczność"
Private option: "Prywatny"
Global option: "Publiczny dla zalogowanych"
Helper: "Publiczne składy może oglądać każdy zalogowany użytkownik. Edytować mogą tylko zaproszeni edytorzy."
```

Viewer detail mode:

- Show group name, owner, squads, and character cards/list items.
- Hide save button, character picker, add/remove controls, squad structural controls, editor management, and visibility controls.
- Use read-only copy: “Widok tylko do odczytu”.

Accessibility:

- Visibility toggle must be keyboard operable and labeled.
- Public/private status must be text, not color-only.
- Global group cards/rows should be links with accessible names including group name and owner.

## Files to Add / Change / Delete

### Add

```txt
packages/api/src/modules/squad-builder/squad-group-visibility.ts
```

Visibility parser/domain module.

```txt
packages/api/src/modules/squad-builder/set-squad-group-visibility.ts
packages/api/src/modules/squad-builder/list-global-squad-groups.ts
```

Service modules.

```txt
packages/api/src/modules/squad-builder/squad-group-visibility.test.ts
packages/api/src/modules/squad-builder/global-squad-visibility.test.ts
```

Focused domain/service behavior tests.

### Change

```txt
packages/api/src/modules/squad-builder/squad-group-access.ts
```

Add `viewer` role and access precedence helpers.

```txt
packages/api/src/modules/squad-builder/list-squad-groups.ts
```

Ensure detail read uses owner/editor/global-viewer authorization.

```txt
packages/api/src/modules/squad-builder/save-squad-group.ts
packages/api/src/modules/squad-builder/save-shared-squad-group-characters.ts
```

No behavior widening; tests should prove global viewers still cannot save.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Implement visibility mutation, global list query, and updated viewer authorization.

```txt
packages/api/src/routers/squad-builder.ts
```

Add routes, DTOs, projections, and error translation.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.integration.test.ts
```

Add real Postgres tests for global listing and role precedence.

```txt
apps/web/src/pages/dashboard/squad-builder/squads.tsx
```

Add public/global list section.

```txt
apps/web/src/pages/dashboard/squad-builder/squad-editor.tsx
```

Add owner visibility controls and viewer read-only rendering.

### Delete

None.

## RGR TDD Test Plan

### 1. Parse squad group visibility

RED:

```ts
it("parses private and global squad group visibility values", () => {});
it("rejects unknown squad group visibility values", () => {});
```

GREEN: implement `squad-group-visibility.ts`.

### 2. Owner can set group global

RED:

```ts
it("lets the squad group owner mark a group globally visible", async () => {});
```

Use a recording fake store.

GREEN: implement `SetSquadGroupVisibility` service.

### 3. Non-owner cannot change visibility

RED:

```ts
it("rejects visibility changes from non-owners", async () => {});
```

GREEN: store/service returns `ActorDoesNotOwnSquadGroup`.

### 4. Owner can make group private again

RED:

```ts
it("lets the owner make a globally visible group private again", async () => {});
```

GREEN: same service supports both visibility variants.

### 5. Global list includes only global groups

RED:

```ts
it("lists globally visible squad groups and excludes private groups", async () => {});
```

Use real Postgres integration because this proves query semantics.

GREEN: implement `listGlobalSquadGroups` query.

### 6. Global viewer can load global group detail

RED:

```ts
it("loads global squad group detail for a verified non-owner with accessRole viewer", async () => {});
```

GREEN: update viewer authorization and detail projection.

### 7. Private group remains hidden from non-owner/non-editor

RED:

```ts
it("rejects private squad group detail for a user who is neither owner nor accepted editor", async () => {});
```

GREEN: preserve private authorization.

### 8. Access precedence returns editor over viewer

RED:

```ts
it("returns editor access for an accepted editor even when the group is global", async () => {});
```

GREEN: implement access precedence owner > editor > viewer.

### 9. Global viewer cannot save as owner

RED:

```ts
it("rejects full squad group saves from a global viewer", async () => {});
```

GREEN: keep owner save owner-only.

### 10. Global viewer cannot save as editor

RED:

```ts
it("rejects shared character placement saves from a global viewer without editor access", async () => {});
```

GREEN: keep editor save accepted-editor-only.

### 11. Router integration: visibility toggle and global list

RED:

```ts
it("lets an owner publish a squad group and lets another verified user see it in the global list", async () => {});
```

GREEN: add ORPC endpoints and projections.

### 12. Router integration: private again removes viewer access

RED:

```ts
it("removes global viewer access when the owner makes the group private again", async () => {});
```

GREEN: complete visibility update/read path.

### 13. Frontend behavior: public list and read-only detail

RED:

```ts
it("shows public squad groups and opens them in read-only mode for non-editors", async () => {});
```

If no frontend test harness exists, document the UI automation gap and rely on API integration plus type checks.

## Risks and Open Questions

1. **Global means verified users only.** This spec intentionally does not expose public unauthenticated pages.
2. **No filtering until Slice 8.** The global list uses a bounded recent list. Name/level filters are intentionally deferred.
3. **Visibility update timestamp policy.** Recommended behavior is to update `updatedAt` only when visibility changes. If implementation updates every call, tests should assert idempotent visibility semantics rather than exact timestamp behavior.
4. **Viewer read-only must be enforced server-side.** UI hiding controls is not enough; owner/editor mutation endpoints remain permission-checked.
5. **Large global list growth.** Slice 7 can use a fixed limit. Add pagination/filtering in Slice 8 if needed.

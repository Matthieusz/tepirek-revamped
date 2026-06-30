# Squad Builder Slice 5 Tech Spec

## Summary

Build the first useful squad-building milestone: a verified user can create a personal squad group, manage squads inside it, add/remove accessible Jaruna characters, explicitly save, and reopen the saved group.

This slice adds:

- Squads page with “my squad groups”.
- Create squad group with required name.
- Squad group detail/editor page.
- Add/remove squads inside a group.
- Add/remove characters within squads.
- Explicit save button for draft changes.
- Available character list from accounts accessible to the squad group owner.
- Server-side validation for all squad and group invariants.
- Persistence hardening for cross-squad character uniqueness and one-account-per-squad rules.

This slice does not build squad sharing/editor invites or global visibility. The actor is the group owner for every mutation.

## Context / Current State

Relevant plan: `docs/squad-builder-plan.md`, Slice 5.

Existing/planned foundation:

- Slice 1 schema already created:
  - `margonem_accounts`
  - `margonem_characters`
  - `margonem_account_access`
  - `squad_groups`
  - `squads`
  - `squad_characters`
- Slice 2 adds Accounts page and owned account import/list.
- Slice 3 adds accepted account sharing, but recommended build order places Slice 5 before Slice 3. Therefore Slice 5 must work with owned accounts now and be compatible with accepted shared accounts later.
- Slice 4 refetch cleanup depends on real squad rows and removes deleted/no-longer-Jaruna characters from affected squads.

Current `squad_characters` schema:

```ts
export const squadCharacter = pgTable(
  "squad_characters",
  {
    id: serial("id").primaryKey(),
    squadId: integer("squad_id")
      .references(() => squad.id, {
        onDelete: "cascade",
      })
      .notNull(),
    characterId: integer("character_id")
      .references(() => margonemCharacter.id, {
        onDelete: "cascade",
      })
      .notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("squad_characters_squad_character_unique").on(
      table.squadId,
      table.characterId
    ),
  ]
);
```

This is not enough to enforce:

- same character only once across all squads in a group;
- maximum one character from the same Margonem account within one squad.

## Goals

- Let a verified user create and name a squad group.
- Let the group owner create, rename, reorder, and remove squads inside the group.
- Let the group owner add/remove characters in squads.
- Enforce each squad has at most 10 characters.
- Enforce no duplicate character inside a squad.
- Enforce each squad has at most one character from the same Margonem account.
- Enforce the same character appears at most once across a squad group.
- Let the same character appear again in a different squad group.
- Only allow Jaruna characters from accounts accessible to the squad group owner:
  - owned accounts now;
  - accepted shared accounts once Slice 3 exists.
- Persist through one explicit save operation for the whole editable group snapshot.
- Return character display metadata needed by the builder UI.

## Non-Goals

- No invited squad editors; Slice 6.
- No global squad visibility; Slice 7.
- No squad search/filtering; Slice 8.
- No account refetch behavior; Slice 4.
- No drag-and-drop requirement. Reordering can be simple up/down controls or implicit array order.
- No delete group requirement unless a small delete action already fits the local UI. The plan says deletion exists “if deletion exists in app scope”, so this spec does not require it.
- No optimistic multiplayer conflict resolution. Last explicit owner save wins only after server validation.

## Invariants

```ts
type BasicSquadBuilderInvariant =
  | "Only the squad group owner can create or edit the group in Slice 5"
  | "Squad group name is required"
  | "A squad group contains zero or more squads"
  | "Each squad belongs to exactly one squad group"
  | "Each squad has at most 10 characters"
  | "No duplicate character can appear in one squad"
  | "A squad can contain at most one character from the same Margonem account"
  | "The same character can appear at most once across all squads in one group"
  | "The same character can appear in different squad groups"
  | "All squad characters must be Jaruna characters"
  | "All squad characters must come from accounts accessible to the squad group owner"
  | "Save is atomic: a group snapshot is fully persisted or not persisted at all";
```

## Design Constraints

- Use existing Drizzle/Postgres persistence and ORPC router patterns.
- Keep raw ORPC DTOs at the router boundary; service modules receive parsed values.
- Use a Service Module for squad group draft validation and save orchestration.
- Keep persistence adapter SQL and transaction behavior in `DrizzleSquadBuilderStore`.
- Use explicit operation inputs and typed expected failures.
- Do not trust client-side validation. The backend validates every save.
- UI follows existing dark product layout: efficient, task-focused, no decorative drag/drop dependency unless already established.

## Alternatives Considered

### Option 1: CRUD endpoints for every small edit

```txt
create squad group
create squad
rename squad
add character
remove character
move character
rename group
```

Pros:

- Small commands.
- Each UI action can persist immediately.

Cons:

- Violates the plan's explicit Save button editing model.
- Many endpoints have to re-check whole-group invariants.
- Partial saves can leave users with surprising intermediate states.
- Harder to support a draft editor and “discard changes”.

### Option 2: Client-only builder with one generic JSON blob saved per group

```txt
save { groupName, squads: [...] } as JSON
```

Pros:

- Minimal schema and SQL.
- Easy UI iteration.

Cons:

- Loses relational integrity with accounts/characters.
- Refetch/account-access cleanup cannot reliably remove affected characters.
- Querying and future sharing/filtering become harder.
- Violates existing normalized schema direction.

### Option 3: Whole-group snapshot save over normalized tables

```txt
load group detail
client edits local draft
saveSquadGroupSnapshot({ groupId, name, squads[] })
  -> server validates full snapshot
  -> transaction replaces squads/squad_characters for that group
```

Pros:

- Matches explicit Save button UX.
- Server can validate complete group invariants in one place.
- Normalized tables remain usable for refetch cleanup, sharing, and filtering.
- Tests can verify service behavior through one deep module interface.

Cons:

- Save command is larger.
- Requires careful transaction and position handling.

### Option 4: Full event-sourced draft model

Persist every draft operation as an event, then materialize group state on publish/save.

Pros:

- Rich undo/audit potential.
- Could support collaborative editing later.

Cons:

- Far beyond Slice 5 requirements.
- Adds operational and schema complexity before product value is proven.

## Recommendation

Use **Option 3: whole-group snapshot save over normalized tables**.

It gives the UI an explicit Save button, keeps server-side validation authoritative, and preserves relational data needed by refetch cleanup, access revocation cleanup, and future sharing/global lists.

## Proposed Design

Add squad group operations under `squadBuilder`:

```ts
squadBuilder.listMySquadGroups();
squadBuilder.createSquadGroup(input);
squadBuilder.getSquadGroupDetail(input);
squadBuilder.listAvailableSquadCharacters(input);
squadBuilder.saveSquadGroup(input);
```

Frontend routes:

```txt
/dashboard/squad-builder/squads
/dashboard/squad-builder/squads/$groupId
```

UI flow:

```txt
Squads page
  -> list my squad groups
  -> create group form
  -> click group
  -> editor loads group detail + available characters
  -> user edits local draft
  -> explicit Save button sends complete snapshot
  -> server validates and persists atomically
```

## Domain Model and Types

### Branded ids

```ts
export type SquadGroupId = number & {
  readonly __brand: "SquadGroupId";
};

export type SquadId = number & {
  readonly __brand: "SquadId";
};

export type SquadCharacterPlacementId = number & {
  readonly __brand: "SquadCharacterPlacementId";
};

export type InvalidSquadGroupId = { readonly _tag: "InvalidSquadGroupId" };
export type InvalidSquadId = { readonly _tag: "InvalidSquadId" };

export const parseSquadGroupId = (
  input: number
): Result<SquadGroupId, InvalidSquadGroupId>;

export const parseSquadId = (
  input: number
): Result<SquadId, InvalidSquadId>;
```

### Names and positions

```ts
export type SquadGroupName = string & {
  readonly __brand: "SquadGroupName";
};

export type SquadName = string & {
  readonly __brand: "SquadName";
};

export type SquadPosition = number & {
  readonly __brand: "SquadPosition";
};

export type CharacterPosition = number & {
  readonly __brand: "CharacterPosition";
};

export type InvalidSquadGroupName = {
  readonly _tag: "InvalidSquadGroupName";
  readonly message: string;
};

export type InvalidSquadName = {
  readonly _tag: "InvalidSquadName";
  readonly message: string;
};
```

Rules:

```ts
const squadBuilderNamingPolicy = {
  squadGroupNameMaxLength: 80,
  squadNameMaxLength: 60,
  trim: true,
} as const;
```

### Squad group snapshot

```ts
export type SquadGroupDraftSnapshot = {
  readonly groupId: SquadGroupId;
  readonly name: SquadGroupName;
  readonly squads: readonly SquadDraftSnapshot[];
};

export type SquadDraftSnapshot = {
  readonly clientKey: string;
  readonly squadId?: SquadId;
  readonly name: SquadName;
  readonly position: SquadPosition;
  readonly characters: readonly SquadCharacterDraftPlacement[];
};

export type SquadCharacterDraftPlacement = {
  readonly characterId: number; // local margonem_characters.id parsed at validation boundary
  readonly position: CharacterPosition;
};
```

`clientKey` is a UI-only stable key for unsaved squads. It never persists.

### Available character read model

```ts
export type AvailableSquadCharacter = {
  readonly characterId: number; // local margonem_characters.id
  readonly margonemCharacterId: MargonemCharacterId;
  readonly accountId: MargonemAccountId;
  readonly accountDisplayName: AccountDisplayName;
  readonly accountOwnerUserId: AppUserId;
  readonly accountOwnerUserName: string;
  readonly accountOwnerUserImage: string | null;
  readonly name: string;
  readonly level: PositiveLevel;
  readonly profession: MargonemProfession;
  readonly avatarUrl: string | null;
  readonly world: MargonemWorld;
};
```

Clan is omitted unless parser/storage actually owns it by implementation time. If `clanName` exists, add `readonly clanName: string | null`.

### Validation failures

```ts
export type SquadGroupValidationError =
  | InvalidSquadGroupName
  | InvalidSquadName
  | { readonly _tag: "SquadGroupNotFound" }
  | { readonly _tag: "ActorDoesNotOwnSquadGroup" }
  | {
      readonly _tag: "TooManyCharactersInSquad";
      readonly squadClientKey: string;
      readonly maxCharacters: 10;
    }
  | {
      readonly _tag: "DuplicateCharacterInSquad";
      readonly squadClientKey: string;
      readonly characterId: number;
    }
  | {
      readonly _tag: "DuplicateAccountInSquad";
      readonly squadClientKey: string;
      readonly accountId: MargonemAccountId;
    }
  | {
      readonly _tag: "DuplicateCharacterInSquadGroup";
      readonly characterId: number;
    }
  | {
      readonly _tag: "SquadCharacterNotAccessible";
      readonly characterId: number;
    }
  | { readonly _tag: "SquadCharacterNotJaruna"; readonly characterId: number }
  | { readonly _tag: "InvalidSquadSnapshot"; readonly message: string };
```

## Types, Interfaces, and APIs

### Protocol DTOs

```ts
export type CreateSquadGroupDto = {
  readonly name: string;
};

export type CreateSquadGroupResponseDto = {
  readonly groupId: number;
  readonly name: string;
};

export type ListMySquadGroupsResponseDto = {
  readonly groups: readonly {
    readonly groupId: number;
    readonly name: string;
    readonly squadCount: number;
    readonly characterCount: number;
    readonly updatedAt: string;
  }[];
};

export type GetSquadGroupDetailDto = {
  readonly groupId: number;
};

export type SquadGroupDetailDto = {
  readonly groupId: number;
  readonly name: string;
  readonly updatedAt: string;
  readonly squads: readonly {
    readonly squadId: number;
    readonly name: string;
    readonly position: number;
    readonly characters: readonly SquadGroupCharacterDto[];
  }[];
};

export type SquadGroupCharacterDto = {
  readonly placementId: number;
  readonly characterId: number;
  readonly margonemCharacterId: number;
  readonly accountId: number;
  readonly accountDisplayName: string;
  readonly accountOwnerUserName: string;
  readonly accountOwnerUserImage: string | null;
  readonly name: string;
  readonly level: number;
  readonly profession: MargonemProfession;
  readonly avatarUrl: string | null;
  readonly position: number;
};

export type ListAvailableSquadCharactersDto = {
  readonly groupId: number;
};

export type ListAvailableSquadCharactersResponseDto = {
  readonly characters: readonly AvailableSquadCharacterDto[];
};

export type AvailableSquadCharacterDto = {
  readonly characterId: number;
  readonly margonemCharacterId: number;
  readonly accountId: number;
  readonly accountDisplayName: string;
  readonly accountOwnerUserName: string;
  readonly accountOwnerUserImage: string | null;
  readonly name: string;
  readonly level: number;
  readonly profession: MargonemProfession;
  readonly avatarUrl: string | null;
};

export type SaveSquadGroupDto = {
  readonly groupId: number;
  readonly name: string;
  readonly squads: readonly {
    readonly clientKey: string;
    readonly squadId?: number;
    readonly name: string;
    readonly position: number;
    readonly characters: readonly {
      readonly characterId: number;
      readonly position: number;
    }[];
  }[];
};

export type SaveSquadGroupResponseDto = SquadGroupDetailDto;
```

### Service contracts

```ts
export interface SquadGroupStore {
  readonly createSquadGroup: (
    input: CreateSquadGroupStoreInput
  ) => Promise<Result<SquadGroupSummary, SquadBuilderPersistenceUnavailable>>;

  readonly listMySquadGroups: (
    input: ListMySquadGroupsInput
  ) => Promise<
    Result<readonly SquadGroupSummary[], SquadBuilderPersistenceUnavailable>
  >;

  readonly getSquadGroupDetail: (
    input: GetSquadGroupDetailInput
  ) => Promise<
    Result<
      SquadGroupDetail,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listAvailableCharactersForOwner: (
    input: ListAvailableCharactersForOwnerInput
  ) => Promise<
    Result<
      readonly AvailableSquadCharacter[],
      SquadBuilderPersistenceUnavailable
    >
  >;

  readonly saveSquadGroupSnapshot: (
    input: SaveSquadGroupSnapshotStoreInput
  ) => Promise<
    Result<
      SquadGroupDetail,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
}
```

```ts
export type CreateSquadGroupInput = {
  readonly actorUserId: AppUserId;
  readonly name: string;
};

export type CreateSquadGroupError =
  | InvalidSquadGroupName
  | SquadBuilderPersistenceUnavailable;

export class CreateSquadGroup {
  constructor(private readonly store: SquadGroupStore) {}

  /** Create an empty private squad group owned by the actor. */
  create(
    input: CreateSquadGroupInput
  ): Promise<Result<SquadGroupSummary, CreateSquadGroupError>>;
}
```

```ts
export type SaveSquadGroupInput = {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly name: string;
  readonly squads: readonly SaveSquadInput[];
};

export type SaveSquadInput = {
  readonly clientKey: string;
  readonly squadId?: SquadId;
  readonly name: string;
  readonly position: number;
  readonly characters: readonly {
    readonly characterId: number;
    readonly position: number;
  }[];
};

export type SaveSquadGroupError =
  | SquadGroupValidationError
  | SquadBuilderPersistenceUnavailable;

export class SaveSquadGroup {
  constructor(
    private readonly store: SquadGroupStore,
    private readonly clock: Clock
  ) {}

  /** Validate and atomically save a full squad group snapshot. */
  save(
    input: SaveSquadGroupInput
  ): Promise<Result<SquadGroupDetail, SaveSquadGroupError>>;
}
```

```ts
export class ListSquadGroups {
  constructor(private readonly store: SquadGroupStore) {}

  /** List squad groups owned by the actor. */
  listMine(input: {
    readonly actorUserId: AppUserId;
  }): Promise<
    Result<readonly SquadGroupSummary[], SquadBuilderPersistenceUnavailable>
  >;

  /** Load a squad group owned by the actor for editing. */
  getMine(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Promise<
    Result<
      SquadGroupDetail,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
}
```

```ts
export class ListAvailableSquadCharacters {
  constructor(private readonly store: SquadGroupStore) {}

  /** List Jaruna characters accessible to the squad group owner. */
  list(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Promise<
    Result<
      readonly AvailableSquadCharacter[],
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;
}
```

### Snapshot validation

```ts
export type ValidateSquadGroupSnapshotInput = {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly name: string;
  readonly squads: readonly SaveSquadInput[];
  readonly availableCharacters: readonly AvailableSquadCharacter[];
};

/** Validate a squad group snapshot against accessible Jaruna characters and group rules. */
export const validateSquadGroupSnapshot = (
  input: ValidateSquadGroupSnapshotInput
): Result<SquadGroupDraftSnapshot, SquadGroupValidationError>;
```

Validation algorithm:

```txt
parse group name
for each squad:
  parse squad name
  parse positions as non-negative integers
  if characters.length > 10 -> TooManyCharactersInSquad
  for each character placement:
    ensure character exists in availableCharacters
    ensure world === 'jaruna'
    ensure not duplicate in squad
    ensure not duplicate account in squad
    ensure not duplicate character in whole group
return parsed snapshot
```

## Persistence Schema Changes

Harden `squad_characters` with denormalized parent fields needed for database-level constraints.

```ts
export const squadCharacter = pgTable(
  "squad_characters",
  {
    id: serial("id").primaryKey(),
    squadGroupId: integer("squad_group_id")
      .references(() => squadGroup.id, { onDelete: "cascade" })
      .notNull(),
    squadId: integer("squad_id")
      .references(() => squad.id, { onDelete: "cascade" })
      .notNull(),
    accountId: integer("account_id")
      .references(() => margonemAccount.id, { onDelete: "cascade" })
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
    uniqueIndex("squad_characters_group_character_unique").on(
      table.squadGroupId,
      table.characterId
    ),
    uniqueIndex("squad_characters_squad_account_unique").on(
      table.squadId,
      table.accountId
    ),
    uniqueIndex("squad_characters_squad_position_unique").on(
      table.squadId,
      table.position
    ),
    index("squad_characters_group_id_idx").on(table.squadGroupId),
    index("squad_characters_character_id_idx").on(table.characterId),
  ]
);
```

Also add position uniqueness for squads:

```ts
uniqueIndex("squads_group_position_unique").on(
  table.squadGroupId,
  table.position
);
```

The service still validates before writing. Database constraints are the final concurrency/invariant guard.

## Seams, Boundaries, Adapters, and Implementations

### Domain modules

```txt
packages/api/src/modules/squad-builder/squad-group-id.ts
packages/api/src/modules/squad-builder/squad-id.ts
packages/api/src/modules/squad-builder/squad-name.ts
packages/api/src/modules/squad-builder/squad-group-snapshot.ts
```

Own id parsing, names, snapshot validation, and invariant failures.

### Service modules

```txt
packages/api/src/modules/squad-builder/create-squad-group.ts
packages/api/src/modules/squad-builder/list-squad-groups.ts
packages/api/src/modules/squad-builder/list-available-squad-characters.ts
packages/api/src/modules/squad-builder/save-squad-group.ts
```

Own use-case orchestration and dependency contracts.

### Persistence adapter

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Extend with `SquadGroupStore`. It owns Drizzle queries, transactions, row projections, and accessible-character joins.

### Router boundary

```txt
packages/api/src/routers/squad-builder.ts
```

Add endpoints, DTO parsing, service composition, ORPC error translation, and protocol projections.

### Frontend routes/pages

```txt
apps/web/src/routes/dashboard/squad-builder/squads.tsx
apps/web/src/routes/dashboard/squad-builder/squads/$groupId.tsx
apps/web/src/pages/dashboard/squad-builder/squads.tsx
apps/web/src/pages/dashboard/squad-builder/squad-editor.tsx
```

List page owns create/list UX. Editor page owns local draft state, available character filtering, and save mutation.

### Sidebar

```txt
apps/web/src/components/sidebar/app-sidebar.tsx
```

Add a Squads route under the squad-builder navigation group if Slice 2 only added Accounts.

## Call Stacks and Data Flow

### Current / Old Flow

```txt
User imports accounts and sees Jaruna characters
  -> no Squads page
  -> no squad group creation
  -> no available character builder UI
  -> no saved squads
```

### Proposed / New Flow: Create Squad Group

```txt
raw form { name }
  -> ORPC DTO { name: string }
  -> zod parser
  -> parseAppUserId(context.session.user.id)
  -> CreateSquadGroup.create({ actorUserId, name })
  -> parseSquadGroupName(name)
  -> SquadBuilderStore.createSquadGroup
       insert squad_groups(ownerUserId, name, visibility='private')
  -> SquadGroupSummary
  -> protocol DTO
  -> navigate to /dashboard/squad-builder/squads/$groupId
```

### Proposed / New Flow: Load Editor

```txt
route param groupId
  -> parse number in route/page boundary
  -> useQuery(getSquadGroupDetail({ groupId }))
  -> router zod parser
  -> parseAppUserId
  -> parseSquadGroupId
  -> ListSquadGroups.getMine
  -> store.getSquadGroupDetail({ actorUserId, groupId })
       load group where ownerUserId = actor
       load squads + placed characters + account/user metadata
  -> protocol DTO
  -> client creates local draft state

parallel:
  -> useQuery(listAvailableSquadCharacters({ groupId }))
  -> verify actor owns group
  -> list owned account characters now and accepted shared account characters when Slice 3 exists
  -> protocol DTO
  -> character picker
```

### Proposed / New Flow: Save Squad Group

```txt
local draft state
  -> ORPC DTO SaveSquadGroupDto
  -> zod DTO parser
  -> parseAppUserId
  -> parseSquadGroupId
  -> parse optional SquadId values
  -> SaveSquadGroup.save
  -> store.listAvailableCharactersForOwner({ ownerUserId: actorUserId })
  -> validateSquadGroupSnapshot({ groupId, name, squads, availableCharacters })
  -> store.saveSquadGroupSnapshot
       transaction:
         lock squad group id
         verify group owner
         update group name/updatedAt
         delete existing squads for group (cascade squad_characters)
         insert squads with positions
         insert squad_characters with squadGroupId, squadId, accountId, characterId, position
       reload group detail
  -> protocol DTO
  -> UI clears dirty state
```

### Failure Flow

```txt
missing/empty group name
  -> InvalidSquadGroupName
  -> ORPC BAD_REQUEST
  -> inline form error

actor edits another user's group
  -> ActorDoesNotOwnSquadGroup
  -> ORPC FORBIDDEN

nonexistent group
  -> SquadGroupNotFound
  -> ORPC NOT_FOUND

squad has >10 characters
  -> TooManyCharactersInSquad
  -> ORPC BAD_REQUEST
  -> show squad-level error

duplicate character in same squad or group
  -> DuplicateCharacterInSquad | DuplicateCharacterInSquadGroup
  -> ORPC BAD_REQUEST
  -> highlight character placement

second character from same Margonem account in one squad
  -> DuplicateAccountInSquad
  -> ORPC BAD_REQUEST
  -> show squad-level/account conflict

character is not accessible to owner
  -> SquadCharacterNotAccessible
  -> ORPC FORBIDDEN or BAD_REQUEST
  -> remove/flag stale draft character

DB unique constraint catches concurrent invalid write
  -> classify as SquadBuilderPersistenceUnavailable or precise validation failure where practical
  -> ORPC INTERNAL_SERVER_ERROR or BAD_REQUEST based on classifier confidence
```

### Retry / Cancellation / Idempotency Flow

- Create group is not idempotent; duplicate clicks should be disabled while pending.
- Save snapshot is retry-safe for the same payload because it replaces group squads/placements in one transaction.
- Save does not call external services.
- Save uses a group-scoped transaction/advisory lock to serialize concurrent saves for the same group.
- Queries can use default React Query retry. Mutations should disable duplicate buttons while pending.
- Refetch/account-access cleanup from other slices may remove characters between load and save; save revalidates accessible/current characters and rejects stale placements.

### Observability Flow

Safe fields:

```ts
type SquadGroupLogFields = {
  readonly operation:
    | "createSquadGroup"
    | "listMySquadGroups"
    | "getSquadGroupDetail"
    | "listAvailableSquadCharacters"
    | "saveSquadGroup";
  readonly actorUserId?: string;
  readonly squadGroupId?: number;
  readonly squadCount?: number;
  readonly characterPlacementCount?: number;
  readonly errorTag?: string;
};
```

Log persistence failures and unexpected validation/classification failures with safe fields. Do not log entire draft snapshots because they include user-generated names and potentially large payloads.

## UI Design Notes

Squads list page:

```txt
Header: "Składy"
Helper: "Twórz grupy składów z postaci dostępnych na Twoich kontach."
Primary action: "Nowa grupa"
Empty state: "Nie masz jeszcze grup składów. Utwórz pierwszą grupę i dodaj postacie z Jaruny."
```

Editor layout:

```txt
Top bar:
  group name input
  dirty state text: "Niezapisane zmiany"
  Save button

Main:
  squad columns or stacked squad panels
  each squad: name input, character slots/list, remove squad action

Side panel:
  available characters grouped/filterable by account/profession/level locally
```

Character display:

- name;
- level in mono/data style;
- profession;
- avatar;
- account display name;
- account owner username.

Jaruna does not need visible labeling because v1 only supports Jaruna.

Accessibility:

- Add/remove controls are buttons with character/squad names in labels.
- Save errors are text and associated with affected squad/character where possible.
- Drag-and-drop is not required; if added later, keyboard reordering must exist.
- Character picker filtering must not hide selected characters without a clear selected state.

## Files to Add / Change / Delete

### Add

```txt
packages/api/src/modules/squad-builder/squad-group-id.ts
packages/api/src/modules/squad-builder/squad-id.ts
packages/api/src/modules/squad-builder/squad-name.ts
packages/api/src/modules/squad-builder/squad-group-snapshot.ts
```

Domain parsers and snapshot validation.

```txt
packages/api/src/modules/squad-builder/create-squad-group.ts
packages/api/src/modules/squad-builder/list-squad-groups.ts
packages/api/src/modules/squad-builder/list-available-squad-characters.ts
packages/api/src/modules/squad-builder/save-squad-group.ts
```

Service modules.

```txt
packages/api/src/modules/squad-builder/squad-group-snapshot.test.ts
packages/api/src/modules/squad-builder/save-squad-group.test.ts
```

Focused domain/service behavior tests.

```txt
apps/web/src/routes/dashboard/squad-builder/squads.tsx
apps/web/src/routes/dashboard/squad-builder/squads/$groupId.tsx
apps/web/src/pages/dashboard/squad-builder/squads.tsx
apps/web/src/pages/dashboard/squad-builder/squad-editor.tsx
```

Squads routes/pages.

### Change

```txt
packages/db/src/schema/squad-builder.ts
```

Add denormalized `squadGroupId` and `accountId` to `squadCharacter`; add unique indexes for group character, squad account, squad position, and squad group position.

```txt
packages/db/src/types.ts
```

Update inferred type exports if needed.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Implement `SquadGroupStore` queries and save transaction.

```txt
packages/api/src/routers/squad-builder.ts
```

Add squad group endpoints and error translation.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.integration.test.ts
```

Add real Postgres tests for persisted rules and save transaction.

```txt
packages/api/src/test/integration/database.ts
```

Ensure squad tables truncate in dependency-safe order after schema change.

```txt
apps/web/src/components/sidebar/app-sidebar.tsx
```

Add Squads navigation if missing.

```txt
apps/web/src/routeTree.gen.ts
```

Regenerate through TanStack Router tooling if generated.

### Delete

None.

## RGR TDD Test Plan

### 1. Parse squad group and squad names

RED:

```ts
it("trims and accepts valid squad group and squad names", () => {});
it("rejects empty or overlong squad group and squad names", () => {});
```

GREEN: implement `squad-name.ts`.

### 2. Validate max 10 characters per squad

RED:

```ts
it("rejects a squad snapshot with more than ten characters in one squad", () => {});
```

GREEN: implement first snapshot validation branch.

### 3. Validate duplicate character in squad and group

RED:

```ts
it("rejects duplicate character placements inside one squad and across one group", () => {});
```

GREEN: add duplicate-character checks.

### 4. Validate max one character per account per squad

RED:

```ts
it("rejects two characters from the same Margonem account in one squad", () => {});
```

GREEN: add account conflict check using available character metadata.

### 5. Validate accessible Jaruna characters only

RED:

```ts
it("rejects character placements that are not accessible to the squad group owner", () => {});
```

GREEN: validate against available character map.

### 6. Create squad group service

RED:

```ts
it("creates an empty private squad group for the actor", async () => {});
```

Use recording object fake store.

GREEN: implement `CreateSquadGroup`.

### 7. Save squad group service validates before persistence

RED:

```ts
it("does not write a squad group snapshot when validation fails", async () => {});
```

GREEN: service loads available characters and validates before store save.

### 8. Save squad group service writes a valid snapshot

RED:

```ts
it("saves a valid group snapshot through the store seam", async () => {});
```

GREEN: complete service orchestration.

### 9. Drizzle integration: save and reload group detail

RED:

```ts
it("persists squads and character placements then reloads the group detail", async () => {});
```

Use real Postgres and `DrizzleSquadBuilderStore` service-facing methods.

GREEN: implement save transaction and detail projection.

### 10. Drizzle integration: database enforces group character uniqueness

RED:

```ts
it("prevents the same character from being placed twice in one squad group", async () => {});
```

GREEN: add `squadGroupId` and unique index on `(squadGroupId, characterId)`.

### 11. Drizzle integration: database enforces one account per squad

RED:

```ts
it("prevents two characters from the same Margonem account in one squad", async () => {});
```

GREEN: add `accountId` and unique index on `(squadId, accountId)`.

### 12. Available characters include owned accounts

RED:

```ts
it("lists Jaruna characters from accounts owned by the squad group owner", async () => {});
```

GREEN: implement owned-account available character query.

### 13. Available characters include accepted shared accounts when Slice 3 exists

RED:

```ts
it("lists Jaruna characters from accepted shared accounts for the squad group owner", async () => {});
```

If Slice 3 is not implemented yet, mark this as a pending integration slice and keep the query extension as the seam.

GREEN: include accepted `margonem_account_access` rows when available.

### 14. Router integration: create, save, reopen

RED:

```ts
it("lets a verified user create a squad group, save squads, and reopen the saved detail", async () => {});
```

GREEN: add router endpoints and projections.

### 15. Router integration: owner-only editing

RED:

```ts
it("rejects saving a squad group owned by another user", async () => {});
```

GREEN: classify owner failures to ORPC `FORBIDDEN`.

### 16. Frontend behavior: first useful milestone

RED:

```ts
it("lets the user create a squad group with one squad, add accessible characters, save, and see it persisted", async () => {});
```

If no frontend test harness exists, document the UI automation gap and rely on API integration plus type checks.

## Risks and Open Questions

1. **Build order with Slice 3.** The plan recommends Slice 5 before Slice 3, but available characters eventually include accepted shared accounts. Implement owned accounts first and keep the accepted-access query path ready, or add the shared-account test when Slice 3 lands.
2. **Schema hardening requires migration care.** Adding `squadGroupId` and `accountId` to `squad_characters` is easiest before production data. If data already exists, a backfill is required, but migration/backfill planning is out of scope unless explicitly requested.
3. **Snapshot save deletes/reinserts squads.** This is simple and matches Slice 5. If future features attach stable metadata to squads or placements, switch to diff-based persistence.
4. **Frontend drag-and-drop is optional.** If added, keyboard-accessible alternatives are required. The spec does not require drag-and-drop for Slice 5.
5. **Delete group remains open.** The plan leaves deletion conditional. This slice does not require delete; add it later if product wants it.

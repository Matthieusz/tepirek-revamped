# Squad Builder Slice 6 Tech Spec

## Summary

Build squad group sharing/edit invitations so squad group owners can invite specific verified users to edit existing squads.

This slice adds:

- Owner-only user search for squad editor invite targets.
- Owner-created squad group editor invitations.
- Separate squad group invite inbox.
- Sidebar red dot for pending squad group invites.
- Accept/decline invite actions.
- Shared-with-me squad groups list.
- Accepted editor access to view and save character placements in existing squads.
- Owner-only controls for group name, squad creation/removal/rename, invitations, visibility, and deletion.
- Enforcement that editors can only add characters from accounts accessible to the squad group owner.

This slice does not build global visibility or global read-only browsing. That is Slice 7.

## Context / Current State

Relevant plan: `docs/squad-builder-plan.md`, Slice 6.

Existing/planned foundation:

- Slice 3 account sharing uses accepted account access rows so users can share account characters.
- Slice 5 basic squad builder adds:
  - `listMySquadGroups`
  - `createSquadGroup`
  - `getSquadGroupDetail`
  - `listAvailableSquadCharacters`
  - `saveSquadGroup`
  - owner-only full snapshot editing.
- `squad_group_invitations` already exists in `packages/db/src/schema/squad-builder.ts`:

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
    status: text("status").notNull(),
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

Current gap:

```txt
Squad group owners can build personal groups,
but cannot invite other users to edit them.
Other users cannot accept squad editor invites or save character-placement changes.
The sidebar cannot indicate pending squad group invites.
```

## Goals

- Let squad group owners search verified users by username.
- Let squad group owners send editor invites.
- Let invited users accept or decline squad group invites.
- Let accepted editors view shared squad groups.
- Let accepted editors add/remove/reorder characters within existing squads and save.
- Prevent accepted editors from renaming groups, renaming squads, creating/removing squads, inviting users, changing visibility, or deleting groups.
- Enforce the editor character access rule: editor additions come from accounts accessible to the squad group owner, not the editor's own extra accounts.
- Show pending squad group invites in a dedicated area.
- Add a red dot next to squad builder navigation when the user has pending squad group invites.

## Non-Goals

- No global visibility controls; Slice 7.
- No global read-only lists; Slice 7.
- No search/filtering for shared/global lists; Slice 8.
- No account sharing behavior; Slice 3.
- No owner account-access-loss cleanup beyond relying on Slice 3/4 cleanup paths that remove invalid squad characters.
- No real-time collaborative editing.
- No comment/chat/audit history for editor changes.
- No editor invite expiration.

## Invariants

```ts
type SquadGroupSharingInvariant =
  | "Only the squad group owner can invite editors"
  | "Only the squad group owner can revoke editor access"
  | "The owner cannot invite themself as editor"
  | "Only verified users can be invited as squad group editors"
  | "A user can have at most one invitation row per squad group"
  | "Only the invited user can accept or decline a squad group invite"
  | "Accepted editors can view the original squad group"
  | "Accepted editors can only change character placements inside existing squads"
  | "Accepted editors cannot rename the group or squads"
  | "Accepted editors cannot create or remove squads"
  | "Accepted editors cannot invite users or change visibility"
  | "Editor-added characters must be accessible to the squad group owner"
  | "Editor saves preserve all Slice 5 squad placement invariants";
```

## Design Constraints

- Use the existing `squad_group_invitations` table and unique `(squadGroupId, invitedUserId)` constraint.
- Reuse Slice 5 `SquadGroupStore` and validation where possible, but do not expose owner-only snapshot editing to editors.
- Keep raw ORPC DTOs at `packages/api/src/routers/squad-builder.ts`.
- Service modules receive parsed `AppUserId`, `SquadGroupId`, and `SquadGroupInvitationId` values.
- Persistence adapter owns SQL joins, status transitions, and save transactions.
- Expected failures are typed values in service contracts and translated to ORPC errors at router boundaries.
- UI should extend the existing Squads page/editor with role-based controls, not create a separate editor-only product surface.

## Alternatives Considered

### Option 1: Reuse owner `saveSquadGroup` for editors with hidden UI controls

Editors use the same full snapshot save endpoint. The frontend hides owner-only fields and sends unchanged group/squad names.

Pros:

- Minimal backend API additions.
- Reuses Slice 5 snapshot save exactly.

Cons:

- Security relies on client discipline unless the service deeply diffs owner-only fields.
- Editors could craft a request to rename groups/squads or remove squads.
- Permission model is unclear and easy to regress.

### Option 2: Separate editor placement-save endpoint

Owners keep the Slice 5 full snapshot endpoint. Editors get a narrower endpoint that accepts only placements for existing squad ids.

```txt
saveSharedSquadGroupCharacters({ groupId, squads: [{ squadId, characters[] }] })
```

Pros:

- Interface encodes editor permission limits.
- Server validates existing squad ids and ignores/forbids group/squad structural changes.
- Easier tests for editor permissions.
- Matches plan: editors add/remove characters within existing squads and save.

Cons:

- Adds a second save path.
- Shared validation must reuse core placement rules to avoid duplication.

### Option 3: Make accepted editors full co-owners internally and hide controls in UI

Treat accepted editors as owners for backend purposes and rely on UI to hide forbidden actions.

Pros:

- Very simple backend permission check.

Cons:

- Violates stated permission model.
- Allows crafted requests to perform owner-only actions.
- Makes future visibility/deletion controls unsafe.

## Recommendation

Use **Option 2: separate editor placement-save endpoint**.

A narrow editor endpoint is a deep module interface: it makes illegal editor actions unrepresentable in the request shape and keeps owner-only controls protected at the backend. It can share validation and persistence primitives with the owner save path without sharing a dangerously broad public API.

## Proposed Design

Add squad sharing APIs under `squadBuilder`:

```ts
squadBuilder.searchSquadEditorInviteTargets(input);
squadBuilder.sendSquadGroupEditorInvite(input);
squadBuilder.listIncomingSquadGroupInvites();
squadBuilder.respondToSquadGroupInvite(input);
squadBuilder.revokeSquadGroupEditor(input);
squadBuilder.listSharedSquadGroups();
squadBuilder.listSquadGroupEditorGrants(input);
squadBuilder.getPendingSquadGroupInviteCount();
squadBuilder.saveSharedSquadGroupCharacters(input);
```

Change Slice 5 read APIs so accepted editors can read shared group detail:

```ts
squadBuilder.getSquadGroupDetail(input);
squadBuilder.listAvailableSquadCharacters(input);
```

They should return/use a role:

```ts
type SquadGroupAccessRole = "owner" | "editor";
```

Frontend behavior:

```txt
Squads page
  -> tabs/sections:
       Moje grupy
       Udostępnione mi
       Zaproszenia
  -> sidebar red dot appears when pending squad group invites count > 0

Editor page
  -> owner: full Slice 5 controls + invite management
  -> accepted editor: placement editing only, no group/squad structural controls
```

## Domain Model and Types

### Invitation id and status

```ts
export type SquadGroupInvitationId = number & {
  readonly __brand: "SquadGroupInvitationId";
};

export type InvalidSquadGroupInvitationId = {
  readonly _tag: "InvalidSquadGroupInvitationId";
};

export const parseSquadGroupInvitationId = (
  input: number
): Result<SquadGroupInvitationId, InvalidSquadGroupInvitationId>;

export type SquadGroupInvitationStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "revoked";
```

### Access role

```ts
export type SquadGroupAccessRole = "owner" | "editor";

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
    };
```

### Editor placement snapshot

```ts
export type SaveSharedSquadGroupCharactersInput = {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly squads: readonly SharedSquadCharactersInput[];
};

export type SharedSquadCharactersInput = {
  readonly squadId: SquadId;
  readonly characters: readonly {
    readonly characterId: number;
    readonly position: number;
  }[];
};

export type SharedSquadGroupCharactersSnapshot = {
  readonly groupId: SquadGroupId;
  readonly squads: readonly {
    readonly squadId: SquadId;
    readonly characters: readonly SquadCharacterDraftPlacement[];
  }[];
};
```

Editor save validation reuses Slice 5 placement invariants but adds existing-squad ownership rules:

```ts
export type SharedSquadGroupSaveError =
  | { readonly _tag: "SquadGroupNotFound" }
  | { readonly _tag: "ActorCannotEditSquadGroup" }
  | { readonly _tag: "SquadNotInGroup"; readonly squadId: SquadId }
  | { readonly _tag: "EditorCannotChangeSquadStructure" }
  | SquadGroupValidationError
  | SquadBuilderPersistenceUnavailable;
```

### Invite targets and summaries

```ts
export type SquadEditorInviteTarget = {
  readonly userId: AppUserId;
  readonly name: string;
  readonly image: string | null;
};

export type SquadGroupInvitationSummary = {
  readonly invitationId: SquadGroupInvitationId;
  readonly squadGroupId: SquadGroupId;
  readonly squadGroupName: SquadGroupName;
  readonly ownerUserId: AppUserId;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly status: SquadGroupInvitationStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type SquadGroupEditorGrantSummary = {
  readonly invitationId: SquadGroupInvitationId;
  readonly userId: AppUserId;
  readonly userName: string;
  readonly userImage: string | null;
  readonly status: Extract<SquadGroupInvitationStatus, "pending" | "accepted">;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type SharedSquadGroupSummary = {
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
export type SearchSquadEditorInviteTargetsDto = {
  readonly groupId: number;
  readonly query: string;
};

export type SearchSquadEditorInviteTargetsResponseDto = {
  readonly users: readonly {
    readonly userId: string;
    readonly name: string;
    readonly image: string | null;
  }[];
};

export type SendSquadGroupEditorInviteDto = {
  readonly groupId: number;
  readonly invitedUserId: string;
};

export type SquadGroupInvitationDto = {
  readonly invitationId: number;
  readonly squadGroupId: number;
  readonly squadGroupName: string;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly status: SquadGroupInvitationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type RespondToSquadGroupInviteDto = {
  readonly invitationId: number;
  readonly response: "accept" | "decline";
};

export type RevokeSquadGroupEditorDto = {
  readonly invitationId: number;
};

export type SquadGroupEditorGrantDto = {
  readonly invitationId: number;
  readonly userId: string;
  readonly userName: string;
  readonly userImage: string | null;
  readonly status: "pending" | "accepted";
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SharedSquadGroupDto = {
  readonly groupId: number;
  readonly name: string;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly squadCount: number;
  readonly characterCount: number;
  readonly updatedAt: string;
};

export type PendingSquadGroupInviteCountResponseDto = {
  readonly count: number;
};

export type SaveSharedSquadGroupCharactersDto = {
  readonly groupId: number;
  readonly squads: readonly {
    readonly squadId: number;
    readonly characters: readonly {
      readonly characterId: number;
      readonly position: number;
    }[];
  }[];
};
```

Change Slice 5 detail response:

```ts
export type SquadGroupDetailDto = {
  readonly accessRole: SquadGroupAccessRole;
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
```

### Expected failures

```ts
export type SquadGroupSharingAuthorizationError =
  | { readonly _tag: "SquadGroupNotFound" }
  | { readonly _tag: "ActorDoesNotOwnSquadGroup" }
  | { readonly _tag: "ActorCannotViewSquadGroup" }
  | { readonly _tag: "ActorCannotEditSquadGroup" }
  | { readonly _tag: "CannotInviteSelf" }
  | { readonly _tag: "SquadEditorInviteTargetNotFound" }
  | { readonly _tag: "SquadEditorInviteTargetNotVerified" }
  | { readonly _tag: "SquadGroupInvitationNotFound" }
  | { readonly _tag: "ActorIsNotSquadGroupInviteRecipient" }
  | { readonly _tag: "SquadGroupInvitationTransitionNotAllowed" };

export type SquadGroupSharingError =
  | SquadGroupSharingAuthorizationError
  | InvalidAppUserId
  | InvalidSquadGroupId
  | InvalidSquadGroupInvitationId
  | InvalidSquadId
  | InvalidAccountInviteTargetQuery
  | SharedSquadGroupSaveError
  | SquadBuilderPersistenceUnavailable;
```

`InvalidAccountInviteTargetQuery` can be reused from Slice 3 if it is generic enough; otherwise rename to `InvalidUserSearchQuery` in the implementation.

### Store interface

```ts
export interface SquadGroupSharingStore {
  readonly authorizeSquadGroupOwner: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Promise<
    Result<
      SquadGroupOwnerAccess,
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly authorizeSquadGroupViewer: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Promise<
    Result<
      SquadGroupAccess,
      | SquadGroupNotFound
      | ActorCannotViewSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly authorizeSquadGroupEditor: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Promise<
    Result<
      SquadGroupAccess,
      | SquadGroupNotFound
      | ActorCannotEditSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly searchSquadEditorInviteTargets: (
    input: SearchSquadEditorInviteTargetsStoreInput
  ) => Promise<
    Result<
      readonly SquadEditorInviteTarget[],
      SquadBuilderPersistenceUnavailable
    >
  >;

  readonly findVerifiedSquadEditorInviteTarget: (input: {
    readonly targetUserId: AppUserId;
  }) => Promise<
    Result<
      SquadEditorInviteTarget,
      | SquadEditorInviteTargetNotFound
      | SquadEditorInviteTargetNotVerified
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly upsertSquadGroupEditorInvite: (
    input: UpsertSquadGroupEditorInviteInput
  ) => Promise<
    Result<
      SquadGroupInvitationSummary,
      | SquadGroupInvitationTransitionNotAllowed
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listIncomingSquadGroupInvites: (input: {
    readonly actorUserId: AppUserId;
  }) => Promise<
    Result<
      readonly SquadGroupInvitationSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;

  readonly getPendingSquadGroupInviteCount: (input: {
    readonly actorUserId: AppUserId;
  }) => Promise<Result<number, SquadBuilderPersistenceUnavailable>>;

  readonly respondToSquadGroupInvite: (
    input: RespondToSquadGroupInviteStoreInput
  ) => Promise<
    Result<
      SquadGroupInvitationSummary,
      | SquadGroupInvitationNotFound
      | SquadGroupInvitationTransitionNotAllowed
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly revokeSquadGroupEditor: (
    input: RevokeSquadGroupEditorStoreInput
  ) => Promise<
    Result<
      SquadGroupInvitationSummary,
      | SquadGroupInvitationNotFound
      | SquadGroupInvitationTransitionNotAllowed
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listSharedSquadGroups: (input: {
    readonly actorUserId: AppUserId;
  }) => Promise<
    Result<
      readonly SharedSquadGroupSummary[],
      SquadBuilderPersistenceUnavailable
    >
  >;

  readonly listSquadGroupEditorGrants: (input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) => Promise<
    Result<
      readonly SquadGroupEditorGrantSummary[],
      | SquadGroupNotFound
      | ActorDoesNotOwnSquadGroup
      | SquadBuilderPersistenceUnavailable
    >
  >;

  readonly saveSharedSquadGroupCharacters: (
    input: SaveSharedSquadGroupCharactersStoreInput
  ) => Promise<Result<SquadGroupDetail, SharedSquadGroupSaveError>>;
}
```

Store DTOs:

```ts
export type SearchSquadEditorInviteTargetsStoreInput = {
  readonly groupId: SquadGroupId;
  readonly ownerUserId: AppUserId;
  readonly query: string;
  readonly maxResults: number;
};

export type UpsertSquadGroupEditorInviteInput = {
  readonly groupId: SquadGroupId;
  readonly ownerUserId: AppUserId;
  readonly invitedUserId: AppUserId;
  readonly now: Date;
};

export type RespondToSquadGroupInviteStoreInput = {
  readonly invitationId: SquadGroupInvitationId;
  readonly invitedUserId: AppUserId;
  readonly response: "accept" | "decline";
  readonly now: Date;
};

export type RevokeSquadGroupEditorStoreInput = {
  readonly invitationId: SquadGroupInvitationId;
  readonly ownerUserId: AppUserId;
  readonly now: Date;
};

export type SaveSharedSquadGroupCharactersStoreInput = {
  readonly actorUserId: AppUserId;
  readonly groupId: SquadGroupId;
  readonly snapshot: SharedSquadGroupCharactersSnapshot;
  readonly now: Date;
};
```

### Service modules

```ts
export class SearchSquadEditorInviteTargets {
  constructor(private readonly store: SquadGroupSharingStore) {}

  /** Search verified users the squad group owner may invite as editors. */
  search(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly query: string;
  }): Promise<
    Result<readonly SquadEditorInviteTarget[], SquadGroupSharingError>
  >;
}

export class SendSquadGroupEditorInvite {
  constructor(
    private readonly store: SquadGroupSharingStore,
    private readonly clock: Clock
  ) {}

  /** Send or resend a squad group editor invitation. */
  send(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly invitedUserId: AppUserId;
  }): Promise<Result<SquadGroupInvitationSummary, SquadGroupSharingError>>;
}

export class RespondToSquadGroupInvite {
  constructor(
    private readonly store: SquadGroupSharingStore,
    private readonly clock: Clock
  ) {}

  /** Accept or decline a squad group editor invite as the invited user. */
  respond(input: {
    readonly actorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
    readonly response: "accept" | "decline";
  }): Promise<Result<SquadGroupInvitationSummary, SquadGroupSharingError>>;
}

export class RevokeSquadGroupEditor {
  constructor(
    private readonly store: SquadGroupSharingStore,
    private readonly clock: Clock
  ) {}

  /** Revoke pending or accepted editor access as the squad group owner. */
  revoke(input: {
    readonly actorUserId: AppUserId;
    readonly invitationId: SquadGroupInvitationId;
  }): Promise<Result<SquadGroupInvitationSummary, SquadGroupSharingError>>;
}

export class ListSquadGroupSharingState {
  constructor(private readonly store: SquadGroupSharingStore) {}

  listIncomingInvites(input: {
    readonly actorUserId: AppUserId;
  }): Promise<
    Result<readonly SquadGroupInvitationSummary[], SquadGroupSharingError>
  >;

  listSharedGroups(input: {
    readonly actorUserId: AppUserId;
  }): Promise<
    Result<readonly SharedSquadGroupSummary[], SquadGroupSharingError>
  >;

  listEditorGrants(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }): Promise<
    Result<readonly SquadGroupEditorGrantSummary[], SquadGroupSharingError>
  >;

  countPendingInvites(input: {
    readonly actorUserId: AppUserId;
  }): Promise<Result<number, SquadGroupSharingError>>;
}
```

```ts
export class SaveSharedSquadGroupCharacters {
  constructor(
    private readonly sharingStore: SquadGroupSharingStore,
    private readonly squadStore: SquadGroupStore,
    private readonly clock: Clock
  ) {}

  /** Save character placements in existing squads as owner or accepted editor. */
  save(
    input: SaveSharedSquadGroupCharactersInput
  ): Promise<Result<SquadGroupDetail, SharedSquadGroupSaveError>>;
}
```

Save algorithm for editors:

```txt
authorizeSquadGroupEditor(actorUserId, groupId)
load group detail to get existing squad ids/names/positions and ownerUserId
reject any submitted squadId not in group
reject if submitted squad id set differs from existing squads when using full placement snapshot
list available characters for group owner, not actor
validate placements with Slice 5 rules:
  <= 10 per squad
  no duplicate character in squad/group
  no duplicate account in squad
  accessible to owner
transaction:
  lock group
  verify editor still accepted
  delete existing squad_characters for group
  insert submitted placements preserving existing squad rows
  update group updatedAt
  reload detail with accessRole='editor'
```

Owners may keep using `saveSquadGroup` for full structural edits. The UI may call `saveSharedSquadGroupCharacters` for editor-role saves only.

## Seams, Boundaries, Adapters, and Implementations

### Domain modules

```txt
packages/api/src/modules/squad-builder/squad-group-invitation-id.ts
packages/api/src/modules/squad-builder/squad-group-invitation-status.ts
packages/api/src/modules/squad-builder/squad-group-access.ts
packages/api/src/modules/squad-builder/shared-squad-group-characters-snapshot.ts
```

Own invite id parsing, status transitions, access role types, and editor placement snapshot validation.

### Service modules

```txt
packages/api/src/modules/squad-builder/search-squad-editor-invite-targets.ts
packages/api/src/modules/squad-builder/send-squad-group-editor-invite.ts
packages/api/src/modules/squad-builder/respond-to-squad-group-invite.ts
packages/api/src/modules/squad-builder/revoke-squad-group-editor.ts
packages/api/src/modules/squad-builder/list-squad-group-sharing-state.ts
packages/api/src/modules/squad-builder/save-shared-squad-group-characters.ts
```

Own lifecycle policy and editor permission orchestration.

### Persistence adapter

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Extend existing Drizzle adapter with `SquadGroupSharingStore`. Keep one cohesive squad-builder External Adapter Module.

### Router boundary

```txt
packages/api/src/routers/squad-builder.ts
```

Add endpoints, DTO parsing, service composition, ORPC error translation, safe logs, and role-aware protocol projections.

### Frontend routes/pages

```txt
apps/web/src/pages/dashboard/squad-builder/squads.tsx
apps/web/src/pages/dashboard/squad-builder/squad-editor.tsx
```

Extend list/editor pages. No new route is required unless the existing route layout cannot support invite tabs/sections.

### Sidebar

```txt
apps/web/src/components/sidebar/app-sidebar.tsx
apps/web/src/components/sidebar/nav-main.tsx
```

Add pending invite red dot support. Prefer a `pendingIndicator?: boolean` field on nav items rather than hard-coding squad-builder logic inside the generic nav component.

## Call Stacks and Data Flow

### Current / Old Flow

```txt
Squads page
  -> owner lists my squad groups
  -> owner opens group detail
  -> owner full-edits group snapshot
  -> no editor invites
  -> no shared-with-me squad group list
  -> no pending invite indicator
```

### Proposed / New Flow: Search Editor Invite Targets

```txt
owner search query + groupId
  -> ORPC DTO { groupId: number, query: string }
  -> zod parser
  -> parseAppUserId(session.user.id)
  -> parseSquadGroupId(groupId)
  -> SearchSquadEditorInviteTargets.search
  -> validate query length
  -> store.authorizeSquadGroupOwner({ actorUserId, groupId })
  -> store.searchSquadEditorInviteTargets({ groupId, ownerUserId: actorUserId, query })
       exclude owner and existing pending/accepted editors
  -> protocol DTO
  -> inline invite target results
```

### Proposed / New Flow: Send Editor Invite

```txt
owner clicks invite target
  -> ORPC DTO { groupId: number, invitedUserId: string }
  -> zod parser
  -> parse actor AppUserId
  -> parse invited AppUserId
  -> parse SquadGroupId
  -> SendSquadGroupEditorInvite.send
  -> store.authorizeSquadGroupOwner
  -> reject self-invite
  -> store.findVerifiedSquadEditorInviteTarget
  -> store.upsertSquadGroupEditorInvite
       if no row: insert pending
       if declined/revoked: update pending
       if pending/accepted: transition conflict
  -> protocol DTO
  -> invalidate editor grants query
```

### Proposed / New Flow: Accept/Decline Invite

```txt
invite inbox action
  -> ORPC DTO { invitationId: number, response: 'accept' | 'decline' }
  -> parse actor AppUserId
  -> parse SquadGroupInvitationId
  -> RespondToSquadGroupInvite.respond
  -> store.respondToSquadGroupInvite({ invitationId, invitedUserId: actor, response, now })
       guarded update where id = invitationId and invitedUserId = actor and status = 'pending'
  -> protocol DTO
  -> invalidate pending invite count, incoming invites, shared groups
```

### Proposed / New Flow: Editor Opens Shared Group

```txt
shared group row click
  -> route /dashboard/squad-builder/squads/$groupId
  -> getSquadGroupDetail({ groupId })
  -> store.authorizeSquadGroupViewer
       owner -> owner role
       accepted invitation -> editor role
  -> load group detail
  -> protocol DTO includes accessRole='editor'
  -> UI hides owner-only controls

parallel available characters:
  -> listAvailableSquadCharacters({ groupId })
  -> authorize viewer/editor
  -> determine group ownerUserId
  -> list characters accessible to ownerUserId, not actorUserId
  -> character picker
```

### Proposed / New Flow: Editor Saves Character Placements

```txt
editor local placement draft
  -> ORPC DTO SaveSharedSquadGroupCharactersDto
  -> zod parser
  -> parse actor AppUserId
  -> parse SquadGroupId and SquadIds
  -> SaveSharedSquadGroupCharacters.save
  -> sharingStore.authorizeSquadGroupEditor({ actorUserId, groupId })
  -> squadStore.getSquadGroupDetailForOwnerContext({ groupId })
  -> reject non-existing or missing existing squad ids
  -> squadStore.listAvailableCharactersForOwner({ ownerUserId })
  -> validate placement invariants
  -> sharingStore.saveSharedSquadGroupCharacters transaction
  -> SquadGroupDetail with accessRole='editor'
  -> UI clears dirty state
```

### Proposed / New Flow: Revoke Editor

```txt
owner revokes editor grant
  -> ORPC DTO { invitationId: number }
  -> parse actor AppUserId
  -> parse SquadGroupInvitationId
  -> RevokeSquadGroupEditor.revoke
  -> store.revokeSquadGroupEditor({ invitationId, ownerUserId: actor, now })
       load invitation + group where group.ownerUserId = actor
       guard status pending/accepted
       update status revoked
  -> protocol DTO
  -> invalidate grants query
```

### Failure Flow

```txt
non-owner searches/sends/revokes
  -> ActorDoesNotOwnSquadGroup
  -> ORPC FORBIDDEN

owner invites self
  -> CannotInviteSelf
  -> ORPC BAD_REQUEST

target missing/not verified
  -> SquadEditorInviteTargetNotFound | SquadEditorInviteTargetNotVerified
  -> ORPC NOT_FOUND/BAD_REQUEST

invite already pending or accepted
  -> SquadGroupInvitationTransitionNotAllowed
  -> ORPC CONFLICT

non-recipient accepts invite
  -> SquadGroupInvitationNotFound | ActorIsNotSquadGroupInviteRecipient
  -> ORPC NOT_FOUND/FORBIDDEN

viewer without owner/editor access loads group
  -> ActorCannotViewSquadGroup
  -> ORPC FORBIDDEN

editor tries full owner save endpoint
  -> ActorDoesNotOwnSquadGroup
  -> ORPC FORBIDDEN

editor placement save includes new/removed/renamed squads
  -> EditorCannotChangeSquadStructure | SquadNotInGroup
  -> ORPC BAD_REQUEST/FORBIDDEN

editor adds character only accessible to them, not owner
  -> SquadCharacterNotAccessible
  -> ORPC BAD_REQUEST/FORBIDDEN
```

### Retry / Cancellation / Idempotency Flow

- Send invite is retry-safe for `declined`/`revoked -> pending`; `pending`/`accepted` returns conflict and the UI refreshes.
- Accept/decline uses guarded transition from `pending` only.
- Revoke uses guarded transition from `pending` or `accepted` only.
- Editor placement save is retry-safe for the same payload because it replaces placements inside a transaction.
- Editor placement save uses group-scoped lock/transaction just like owner save.
- No Firecrawl or external network calls occur.
- Pending invite count is a read-only query and may use normal React Query retry.

### Observability Flow

Safe fields:

```ts
type SquadGroupSharingLogFields = {
  readonly operation:
    | "searchSquadEditorInviteTargets"
    | "sendSquadGroupEditorInvite"
    | "respondToSquadGroupInvite"
    | "revokeSquadGroupEditor"
    | "listIncomingSquadGroupInvites"
    | "listSharedSquadGroups"
    | "listSquadGroupEditorGrants"
    | "getPendingSquadGroupInviteCount"
    | "saveSharedSquadGroupCharacters";
  readonly actorUserId?: string;
  readonly squadGroupId?: number;
  readonly invitationId?: number;
  readonly targetUserId?: string;
  readonly errorTag?: string;
  readonly characterPlacementCount?: number;
};
```

Log persistence failures and unexpected authorization failures with safe fields. Do not log full draft payloads or search query text by default.

## UI Design Notes

Squads page additions:

```txt
Sections/tabs:
  Moje grupy
  Udostępnione mi
  Zaproszenia
```

Invite inbox copy:

```txt
Pending invite title: "Zaproszenie do edycji składu"
Accept: "Przyjmij"
Decline: "Odrzuć"
Empty: "Nie masz nowych zaproszeń do składów."
```

Owner editor-management UI:

```txt
Owner-only panel in squad editor:
  title: "Edytorzy"
  search label: "Zaproś użytkownika"
  pending/accepted grants list
  revoke action: "Cofnij dostęp"
```

Role-based editor UI:

- Owner sees full Slice 5 controls.
- Editor sees group and squad names as read-only text.
- Editor can add/remove characters from existing squads and save.
- Editor does not see invite, visibility, delete, create-squad, remove-squad, rename controls.
- Editor character picker copy should clarify: “Dostępne postacie pochodzą z kont dostępnych właścicielowi składu.”

Sidebar red dot:

- Show a small semantic indicator near the squad-builder sidebar item when `pendingInviteCount > 0`.
- The dot must have screen-reader text such as “Masz nowe zaproszenia do składów”.
- Do not use only color without accessible text.

## Files to Add / Change / Delete

### Add

```txt
packages/api/src/modules/squad-builder/squad-group-invitation-id.ts
packages/api/src/modules/squad-builder/squad-group-invitation-status.ts
packages/api/src/modules/squad-builder/squad-group-access.ts
packages/api/src/modules/squad-builder/shared-squad-group-characters-snapshot.ts
```

Domain parsing, status transitions, access role types, and editor placement snapshot validation.

```txt
packages/api/src/modules/squad-builder/search-squad-editor-invite-targets.ts
packages/api/src/modules/squad-builder/send-squad-group-editor-invite.ts
packages/api/src/modules/squad-builder/respond-to-squad-group-invite.ts
packages/api/src/modules/squad-builder/revoke-squad-group-editor.ts
packages/api/src/modules/squad-builder/list-squad-group-sharing-state.ts
packages/api/src/modules/squad-builder/save-shared-squad-group-characters.ts
```

Service modules.

```txt
packages/api/src/modules/squad-builder/squad-group-sharing.test.ts
packages/api/src/modules/squad-builder/save-shared-squad-group-characters.test.ts
```

Focused behavior tests.

### Change

```txt
packages/api/src/modules/squad-builder/squad-builder-store.ts
```

Implement `SquadGroupSharingStore`, role-aware group authorization, invitation lifecycle methods, pending count, shared groups list, editor grants list, and editor placement save transaction.

```txt
packages/api/src/modules/squad-builder/list-squad-groups.ts
packages/api/src/modules/squad-builder/list-available-squad-characters.ts
```

Change read behavior from owner-only to owner-or-accepted-editor where appropriate. Available character lookup must use group owner access, not actor access.

```txt
packages/api/src/routers/squad-builder.ts
```

Add endpoints, role-aware projections, error translation, and router composition options for tests.

```txt
packages/api/src/modules/squad-builder/squad-builder-store.integration.test.ts
```

Add real Postgres tests for invite lifecycle, role-aware reads, editor save limits, and available-character owner rule.

```txt
apps/web/src/pages/dashboard/squad-builder/squads.tsx
```

Add shared groups and invite inbox sections.

```txt
apps/web/src/pages/dashboard/squad-builder/squad-editor.tsx
```

Add role-based controls and owner editor-management panel.

```txt
apps/web/src/components/sidebar/app-sidebar.tsx
apps/web/src/components/sidebar/nav-main.tsx
```

Add pending invite indicator support.

```txt
apps/web/src/routeTree.gen.ts
```

Regenerate if route metadata changes.

### Delete

None.

## RGR TDD Test Plan

### 1. Parse squad group invitation ids and statuses

RED:

```ts
it("accepts positive integer squad group invitation ids", () => {});
it("rejects invalid squad group invitation ids", () => {});
it("parses known squad group invitation statuses", () => {});
```

GREEN: implement id/status domain modules.

### 2. Owner cannot invite themself

RED:

```ts
it("rejects squad group editor self-invites before writing", async () => {});
```

GREEN: implement send service self-guard.

### 3. Non-owner cannot search or send invites

RED:

```ts
it("requires squad group ownership before searching invite targets", async () => {});
it("requires squad group ownership before sending editor invites", async () => {});
```

GREEN: call `authorizeSquadGroupOwner` first.

### 4. Owner can send invite to verified user

RED:

```ts
it("creates a pending squad group editor invite for a verified target", async () => {});
```

GREEN: implement service/store seam call.

### 5. Re-send after declined/revoked returns to pending

RED:

```ts
it("allows resending a squad group editor invite after decline or revoke", async () => {});
```

GREEN: implement status transition helper/upsert behavior.

### 6. Invited user can accept and decline

RED:

```ts
it("lets the invited user accept a pending squad group invite", async () => {});
it("lets the invited user decline a pending squad group invite", async () => {});
```

GREEN: implement respond service and guarded updates.

### 7. Pending invite count reflects only pending invites for actor

RED:

```ts
it("counts only pending squad group invites for the actor", async () => {});
```

GREEN: implement pending count query.

### 8. Accepted editor can load shared group detail

RED:

```ts
it("loads squad group detail for an accepted editor with accessRole editor", async () => {});
```

GREEN: extend group detail authorization/projection.

### 9. Non-editor cannot load private shared group

RED:

```ts
it("rejects squad group detail for a user who is neither owner nor accepted editor", async () => {});
```

GREEN: implement viewer authorization.

### 10. Editor cannot use owner full-save endpoint

RED:

```ts
it("rejects full squad group snapshot save from an accepted editor", async () => {});
```

GREEN: keep Slice 5 owner save owner-only.

### 11. Editor save rejects squad structure changes

RED:

```ts
it("rejects editor placement save when submitted squads differ from existing squads", async () => {});
```

GREEN: implement editor snapshot structural validation.

### 12. Editor can save character placements in existing squads

RED:

```ts
it("lets an accepted editor add and remove characters within existing squads", async () => {});
```

GREEN: implement editor placement save transaction.

### 13. Editor available characters use owner access, not editor access

RED:

```ts
it("does not allow an editor to add characters from accounts only accessible to the editor", async () => {});
```

Use real Postgres because this proves account-access joins.

GREEN: available characters query receives owner user id from group access.

### 14. Owner can revoke editor access

RED:

```ts
it("revokes accepted editor access and prevents later editor saves", async () => {});
```

GREEN: implement revoke lifecycle and save authorization recheck.

### 15. Shared-with-me list includes only accepted editor grants

RED:

```ts
it("lists only accepted shared squad groups for the actor", async () => {});
```

GREEN: implement shared group list query.

### 16. Router integration maps sharing failures to ORPC errors

RED:

```ts
it("returns conflict for an already pending squad group invite", async () => {});
it("returns forbidden when an editor attempts owner-only save", async () => {});
```

GREEN: add router endpoints and error translation.

### 17. Frontend behavior: invite, accept, edit shared group

RED:

```ts
it("lets an owner invite an editor, the editor accept, then save character placements without owner-only controls", async () => {});
```

If no frontend test harness exists, document the UI automation gap and rely on API integration plus type checks.

## Risks and Open Questions

1. **Editor save conflicts with owner saves.** Both save paths replace placements. The group-scoped transaction lock serializes writes, but there is no merge UI. Last successful save wins after server validation.
2. **Accepted editors cannot create/remove squads.** This is a hard backend contract, not only UI behavior. If product later wants editor squad creation, add a new permission variant rather than widening this endpoint silently.
3. **Owner-access character rule depends on account sharing state.** If the owner later loses account access, Slice 3/4 cleanup paths must remove invalid squad characters. This slice prevents new invalid editor additions.
4. **Pending red dot scope.** The red dot covers squad group invites only, per plan. Account access invites remain in the Accounts page unless product requests a combined notification indicator.
5. **Invite history.** Status rows do not keep a full event history. Add audit only if moderation/debugging requires it later.

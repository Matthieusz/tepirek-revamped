# Squad-group archive lifecycle

**Status:** Proposed design, not approved for implementation

## Decision summary

Recommend an owner-only **archive** operation rather than hard deletion. A squad
Group is shared state, and the current schema cascades through squads,
placements, and invitations. Archiving removes the group from active workflows
without destroying the saved arrangement or collaborator history. Restoration
can be offered to the owner while the group is retained.

Hard deletion should remain a separate, explicitly approved lifecycle if data
retention or storage requirements later justify it.

## Current lifecycle and cascade graph

| Relationship from `squadGroup` | Foreign key                                          | Current delete behavior                                              | Archive outcome                                                     |
| ------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `squad`                        | `squad.squadGroupId -> squadGroup.id`                | Cascade deletes every squad in the group                             | Rows remain, hidden from active reads                               |
| `squadCharacter` (group link)  | `squadCharacter.squadGroupId -> squadGroup.id`       | Cascade deletes every placement in the group                         | Rows remain with the archived group                                 |
| `squadCharacter` (squad link)  | `squadCharacter.squadId -> squad.id`                 | Cascade deletes placements when a squad is deleted                   | No row-level change                                                 |
| `squadGroupInvitation`         | `squadGroupInvitation.squadGroupId -> squadGroup.id` | Cascade deletes pending, accepted, declined, and revoked invitations | Invitations remain for history and are excluded from active sharing |
| `squadGroup.ownerUserId`       | `user.id`, `onDelete: cascade`                       | Deleting the owner deletes the group                                 | Archive does not change owner deletion behavior                     |

The group has no separate foreign key for its global visibility. `visibility` is
stored on the group, so archiving a global group must immediately remove it from
the global list and public detail access. Account-sharing is indirect: revoking
an accepted account grant can remove that account's placements from groups
owned by the affected user and updates those groups' `updatedAt`; it does not
remove the group itself.

Current collaborators are the owner, accepted editors, pending invitation
recipients, and global viewers. With the current cascade, hard deletion would
make all of them observe a missing group, while accepted editors would also
lose every saved squad and placement in that group.

## Option matrix

| Option                        | User value                                          | Data risk                                                      | Recovery                                      | Query/UI cost                                                                  | Coarse effort |
| ----------------------------- | --------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ | ------------- |
| Hard delete                   | Clear permanent cleanup                             | High: squads, placements, and invitations disappear            | None without backup restore                   | Low after delete, high confirmation and audit burden                           | Medium        |
| Soft delete with `archivedAt` | Cleanup plus owner recovery                         | Low: rows remain available for restore                         | Owner restore                                 | Medium: every active query filters archived rows; links need explicit handling | Medium        |
| Separate archive table        | Strong retention boundary and compact active tables | Medium: moving/restoring the cascade graph can lose references | Owner restore if all rows are moved correctly | High: copy/move transactions and new read paths                                | High          |

Choose archive now because obsolete groups are the observed problem, while
recovery and collaborator expectations are not yet settled enough to justify
irreversible deletion. The archive fields should be nullable and additive:
`archivedAt` and `archivedByUserId` on `squadGroup`, with a foreign key to
`user` using `set null` if an actor can later be removed. Do not add a generic
trash framework for this slice.

## Proposed contract

The existing save version contract from Plan 005 is the precondition for the
lifecycle mutation.

```text
POST /squad-builder/squad-groups/archive
payload: {
  groupId: number,
  expectedUpdatedAt: date-time
}
success: {
  groupId: number,
  archivedAt: date-time,
  updatedAt: date-time
}
errors: 401, 403 owner-only, 404, 409 stale version, 503 persistence

POST /squad-builder/squad-groups/restore
payload: {
  groupId: number,
  expectedUpdatedAt: date-time
}
success: current squad-group detail
errors: 401, 403 owner-only, 404, 409 stale version, 503 persistence
```

Archive and restore must acquire the same per-group advisory lock used by saves.
The transaction checks the owner and `expectedUpdatedAt` before changing the
row. Archive sets `archivedAt`, `archivedByUserId`, and a fresh `updatedAt`.
Restore clears the archive fields and also advances `updatedAt`.

Archive is idempotent for the owner when the group is already archived and the
request carries the current version. A repeated request with a stale version
still returns 409; clients must not use idempotency to bypass lost-update
detection. Restore is similarly idempotent only when the group is already
active at the supplied version.

### Read behavior

- Active owner, shared-group, global-group, and invitation lists exclude
  archived groups.
- A viewer or editor opening an archived link receives 404, not a permission
  leak about the archive state.
- The owner can see archived groups in a separate owner-only archived list and
  can restore them.
- Pending invitations for an archived group are not actionable. They remain
  retained for history and are marked or projected as inactive by the archive
  read model; no new invitation may be sent while archived.
- Existing accepted collaborators do not receive an automatic replacement or
  destructive notification in this slice. The UI should show that the group is
  no longer available if they navigate to an old link.
- Global links stop resolving as soon as the archive transaction commits.

## UX and accessibility flow

Use an inline owner action on the group detail or owner list, not a modal as the
first solution. Open an inline confirmation row beneath the action:

> Zarchiwizować grupę „{nazwa}”? Grupa zniknie z aktywnej listy, ale właściciel
> będzie mógł ją przywrócić.

The confirmation requires typing the exact group name into a labelled input.
The primary action is `Zarchiwizuj grupę`; the secondary action is `Anuluj`.
Do not place focus in a detached overlay. Move focus to the confirmation heading
when the row opens, return focus to the archive button on cancel, and expose the
row with `aria-live="polite"` only for the state change. Both actions must be
keyboard reachable, have visible focus, and be disabled while the request is
pending. Announce `Archiwizowanie...` on the primary action.

On a stale response, keep the current page and show an inline conflict alert:

> Grupa została zmieniona w innym oknie. Wczytaj najnowszą wersję i spróbuj
> ponownie.

The recovery action must be explicit and must not discard unsaved editor work
without the user choosing to reload. On success, return to the active owner
list with a toast that names the group. A restore action in the archived list
uses direct copy: `Przywróć grupę „{nazwa}”`.

## Follow-up implementation slice

### Backend

1. Add nullable `archivedAt` and `archivedByUserId` columns and an additive
   migration.
2. Add archive/restore schemas, endpoints, typed errors, and owner-only service
   methods.
3. Extend all active squad-group and invitation queries with the archive
   predicate; add an owner-only archived-list query.
4. Reuse the group advisory lock and Plan 005's exact timestamp precondition.
5. Reject sends, visibility changes, and saves for archived groups with a stable
   conflict/not-available error.
6. Preserve invitations and placements; do not issue cascade deletes.

### Frontend

1. Add archive and restore atoms with version payloads and refresh active,
   archived, detail, and sharing resources.
2. Add the inline owner confirmation flow described above.
3. Show archived groups only in an owner-only archived section.
4. Treat archived detail links as unavailable for editors, viewers, and global
   browsing.
5. Preserve a dirty editor draft on 409 and offer deliberate reload/reconcile.

### Migration and operational notes

The migration must be additive and safe on existing groups: `archivedAt` starts
null and all existing groups remain active. Do not backfill archive timestamps.
Document that archiving is reversible while the row is retained and that hard
delete is not part of this implementation slice.

## Acceptance and test matrix

Model tests after the account-delete service tests and the squad-group
integration suite:

| Case                                   | Expected result                                               |
| -------------------------------------- | ------------------------------------------------------------- |
| Owner archives active private group    | 200; active owner list and detail no longer show it           |
| Owner archives global group            | 200; global list and old public link stop exposing it         |
| Editor attempts archive                | 403; no rows change                                           |
| Viewer attempts archive                | 403; no rows change                                           |
| Owner sends invite to archived group   | typed not-available failure                                   |
| Owner saves archived group             | typed not-available failure                                   |
| Stale owner archive                    | 409 before mutation                                           |
| Repeated archive at current version    | idempotent success                                            |
| Owner restores archived group          | 200; original squads, placements, visibility, and name remain |
| Repeated restore at current version    | idempotent success                                            |
| Pending invitation exists at archive   | retained but excluded from actionable incoming lists          |
| Accepted editor opens archived link    | 404 and no detail data                                        |
| Owner archives with account placements | placements retained and restored unchanged                    |
| Owner account deletion afterward       | existing account cascade semantics remain explicit            |

Machine-checkable acceptance requires zero `DELETE` statements against
`squadGroup`, `squad`, `squadCharacter`, or `squadGroupInvitation` in the
archive path, exact version checks under the group lock, and successful restore
of a fixture containing a global group, accepted editor, pending invitation,
squads, and placements.

# Squad Builder Feature Plan

## Goal

Add a squad builder that lets logged-in users create visual, shareable squads for Jaruna characters. Squads help users optimize usage across multiple Margonem accounts and characters.

## Core Requirements

- A squad group is the top-level planning container.
- Each squad group contains multiple squads.
- Each squad contains a maximum of 10 characters.
- Each squad can contain at most 1 character from the same Margonem account.
- Within a single squad group, the same character can only be used once across all squads in that group.
- The same character can appear again in a different squad group.
- Only Jaruna characters are used in v1.
- Users can import Margonem accounts by pasting profile URLs.
- Each Margonem account has one owning app user.
- Account owners can share account access with other app users through in-app invites.
- Shared account access must be accepted before use.
- Squad groups can be shared with specific invited users for editing.
- Squad groups can optionally be globally visible to all logged-in users.
- Global viewers are view-only unless explicitly invited as squad editors.

## Key Data Rules

### Margonem Profile Fetching

- Use Firecrawl as the main scrape tool for Margonem profile HTML instead of direct server-side requests.
- Request Firecrawl's HTML output for the canonical profile URL: `https://www.margonem.pl/profile/view,<profileId>`.
- Do not send character anchors like `#char_<characterId>,jaruna` to Firecrawl because the profile id is enough and anchors do not change the server HTML.
- Firecrawl is used only to retrieve profile HTML; the app parses and stores normalized account/character data from that HTML.
- Parse character rows from the Firecrawl HTML response shape shown in `test-scrape.json`:
  - account/profile name from `.profile-header__name`
  - characters from `li.char-row`
  - Margonem character id from `data-id`
  - name from `data-nick` or `.character-name`
  - level from `data-lvl`
  - world from `data-world`, where Jaruna is `#jaruna`
  - profession from `.character-prof`
  - avatar/outfit URL from `.cimg` inline `background-image`
  - clan is not reliably present in the list HTML fixture, so keep it nullable and fill only when parseable later
- Firecrawl usage must be heavily rate limited because the plan allows only 1000 requests per month.
- Track Firecrawl requests in the database with month, profile id, status, credits used, and timestamp.
- Enforce an application-level monthly budget below the provider limit so the app fails safely before exhausting the 1000-request allowance.
- Do not fetch profiles live on every user view or squad-builder interaction.
- Only fetch during account import and owner-only manual refetch.
- Cache fetched profile results and always store `last fetched` timestamps.
- Deduplicate concurrent fetches for the same numeric profile id.
- Validate duplicate/import-ineligible profile ids before spending Firecrawl credits.
- Prefer stale stored data over spending another Firecrawl request when data is already recent enough.
- Log Firecrawl failures server-side with safe fields and show user-facing per-profile errors.

### Margonem Accounts

- The numeric profile id from the Margonem profile URL uniquely identifies an account.
- Store the numeric profile id.
- Store a user-defined account display name.
- Store the account owner app user id.
- Store the last fetched timestamp on the account.
- Generate profile links from the stored numeric profile id when needed.
- Only the owner can manually refetch the account.

### Characters

- Characters are stored separately from accounts.
- Each character belongs to one Margonem account.
- Store only Jaruna characters.
- Discard non-Jaruna characters during import/refetch.
- Suggested fields:
  - Margonem character id
  - account id
  - name
  - level
  - profession
  - avatar URL
  - clan name

### Refetch Behavior

- Refetch is manual and owner-only.
- Before applying refetch results, show a diff confirmation.
- Diff should show:
  - added Jaruna characters
  - removed or no-longer-Jaruna characters
  - changed name/level/profession/avatar/clan
- On confirm:
  - update changed characters in place
  - add new Jaruna characters
  - delete removed/no-longer-Jaruna characters
  - remove deleted characters from affected squads
- If a character changes level, keep it in squads and update displayed data.
- If a character disappears or moves off Jaruna, remove it from all squads.

## Import Flow

1. Logged-in user opens the Accounts page.
2. User pastes profile URLs into a multiline textarea, one profile URL per line.
3. App validates before fetching:
   - duplicate URL/profile id in the pasted batch
   - account already owned by current user
   - account already exists under another owner
   - account already shared with current user
4. App checks the Firecrawl monthly request budget before queueing valid profile fetches.
5. App queues valid profile fetches through the Firecrawl-backed profile fetcher, using one Firecrawl request per unique profile id.
6. App logs Firecrawl/fetch/parsing failures server-side and shows user-facing errors per failed URL.
7. App shows preview:
   - profile id
   - suggested account name
   - editable account display name
   - Jaruna characters found
8. User confirms save.
9. Account is saved as owned by the current app user.
10. Characters become available for squad building.

## Account Sharing

- Account owners can search users by username.
- Account owners can send account access invites.
- Invites are handled in a dedicated section on the Accounts page.
- Invited users can accept or decline.
- Invites do not expire.
- Owners can revoke accepted access.
- If access is revoked, characters from that account are removed from affected squad groups owned by the revoked user.
- Shared users can use accepted shared accounts in their own squad groups.
- Shared users cannot refetch the account.

## Squad Group and Squad Rules

- Squad group name is required.
- A squad group contains multiple squads.
- Each squad should have a name or generated label.
- Each squad has a maximum of 10 characters.
- No duplicate character within the same squad.
- Maximum 1 character per Margonem account within the same squad.
- Within a single squad group, the same character can only be used once across all squads in that group.
- The same character can appear again in a different squad group.
- All squad characters must be Jaruna characters.
- Available characters come from accounts accessible to the squad group owner:
  - accounts owned by the squad group owner
  - accounts accepted/shared with the squad group owner

## Squad Builder UI

Character cards/list items should show:

- character name
- level
- profession
- avatar
- clan
- Margonem account display name
- app account owner username

Jaruna does not need to be displayed because v1 only supports Jaruna.

Editing should use an explicit Save button when changes are made.

## Squad Sharing and Permissions

### Owner Can

- create squad groups
- rename squad groups
- add/remove squads inside squad groups
- add/remove characters within squads
- save changes
- invite squad editors by username
- change visibility
- make squad globally visible
- make squad private again
- delete squad, if deletion exists in the app scope

### Invited Editors Can

- view squad group
- add/remove characters within existing squads
- save changes to the original squad group

### Invited Editors Cannot

- rename squad
- invite users
- change visibility
- delete squad

### Editor Character Access Rule

Editors can only add characters from accounts accessible to the squad group owner, not from the editor's own extra accounts.

If the squad group owner later loses access to a shared account, characters from that account are removed from affected squads.

## Global Squad Group Visibility

- Squad group owner can mark a squad group globally visible.
- Globally visible squad groups are listed for every logged-in user.
- Owner can make a globally visible squad group private again.
- Global viewers are view-only unless they are explicitly invited as editors.
- Global/shared squad group lists should support filters:
  - squad name
  - level range

## Navigation and Invite Indicators

- Accounts page should include:
  - owned accounts
  - shared-with-me accounts
  - batch import
  - account access invites
  - account sharing management
  - owner-only refetch controls
- Squads page should include:
  - my squad groups
  - shared-with-me squad groups
  - globally visible squad groups
- Squad group invite handling should be separate from account invites.
- Add a red dot next to the squad builder sidebar item when the user has pending squad group invites.

## Implementation Slices

### Slice 1 — Data Model and Margonem Profile Parsing Foundation

Goal: establish backend foundation without UI complexity.

Includes:

- DB tables for:
  - Margonem accounts
  - characters
  - account ownership/access
  - squad groups
  - squads
  - squad characters
  - squad invitations
- profile URL normalization
- numeric profile id extraction
- duplicate profile id validation
- server-side Firecrawl-backed Margonem profile HTML fetch/parsing function
- parser fixture coverage using `test-scrape.json`
- Jaruna-only character filtering from `li.char-row[data-world="#jaruna"]`
- Firecrawl request ledger/budget table
- server-side Firecrawl/fetch failure logging
- strict monthly request-budget protection for the 1000 Firecrawl requests/month limit

Key validation:

- profile id is unique
- account belongs to one owning app user
- non-Jaruna characters are discarded

### Slice 2 — Owned Accounts Import/List Page

Goal: user can add their own Margonem accounts.

Includes:

- Accounts page
- multiline batch import, one profile URL per line
- pre-fetch validation
- fetch each valid profile through the Firecrawl-backed profile fetcher after budget validation
- preview imported account data
- editable account display name before save
- owned accounts list with:
  - account name
  - generated profile link
  - last fetched time
  - character count

### Slice 3 — Account Sharing Invites

Goal: owners can share accounts with other app users.

Includes:

- username search
- send account access invite
- account invites section on Accounts page
- accept/decline invite
- owner revoke access
- shared-with-me accounts list
- owner-only refetch permission
- cleanup affected squads when access is revoked

### Slice 4 — Account Refetch With Diff Confirmation

Goal: safe manual refresh.

Includes:

- owner-only refetch button
- fetch latest Jaruna characters through the Firecrawl-backed profile fetcher after budget validation
- diff preview before applying
- confirm/apply flow
- squad cleanup for removed/no-longer-Jaruna characters

### Slice 5 — Basic Squad Group Builder

Goal: create/edit personal squad groups with squads inside them.

Includes:

- Squads page
- create squad group
- required squad group name
- create/manage squads inside the group
- add/remove characters within squads
- explicit save button
- validation rules enforced per squad and per squad group
- available character list based on squad group owner's accessible accounts
- character display metadata

### Slice 6 — Squad Sharing/Edit Invitations

Goal: invite specific users to edit squad groups.

Includes:

- owner invites users by username
- separate squad group invite section
- sidebar red dot for pending squad group invites
- accept/decline invite
- accepted editors can add/remove characters within squads and save
- enforce owner-only controls for name, invites, visibility, and deletion

### Slice 7 — Global Squad Visibility

Goal: logged-in users can discover public squad groups.

Includes:

- owner can mark squad group globally visible/private
- global squad group list for logged-in users
- global viewers are view-only unless explicitly invited as editors

### Slice 8 — Squad Search/Filtering

Goal: make global/shared squad groups useful.

Includes filters:

- squad name
- level range

Likely applies to:

- global squad groups list
- shared-with-me squad groups list
- optionally my squad groups list

### Slice 9 — Polish, Permissions Hardening, and Edge Cases

Goal: make the feature reliable.

Includes:

- server-side authorization checks everywhere
- squad group cleanup when account access is revoked
- squad cleanup when characters are removed on refetch
- empty states
- loading states
- batch import partial failure handling
- Firecrawl monthly budget exhaustion handling
- Firecrawl request ledger review/cleanup policy
- clear UI wording

## Recommended Build Order

1. Slice 1 — Data model and Margonem profile parsing foundation
2. Slice 2 — Owned accounts import/list page
3. Slice 5 — Basic squad group builder
4. Slice 3 — Account sharing invites
5. Slice 6 — Squad sharing/edit invitations
6. Slice 4 — Account refetch with diff confirmation
7. Slice 7 — Global squad visibility
8. Slice 8 — Squad search/filtering
9. Slice 9 — Polish, permissions hardening, and edge cases

## First Useful Milestone

The first useful milestone should be:

> User imports accounts, sees Jaruna characters, creates a valid squad group with at least one squad, and saves it.

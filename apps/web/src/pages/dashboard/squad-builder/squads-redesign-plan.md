# Squads and Squad Group Editor ReUI Redesign Plan

## Status

- Planning only. Do not install or change runtime code as part of this document.
- List target: `apps/web/src/pages/dashboard/squad-builder/squads.tsx`
- Editor target: `apps/web/src/pages/dashboard/squad-builder/squad-editor.tsx`
- Routes: `/dashboard/squad-builder/squads` and `/dashboard/squad-builder/squads/$groupId`
- The detail route is a squad-group editor keyed by `groupId`, not a single-squad page keyed by `squadId`.
- UI base: Base UI through shadcn `base-nova`.
- Surface decision: use ReUI `Frame` consistently on both routes. Do not mix ReUI Frame and shadcn Card as top-level surfaces.
- Package manager: pnpm 11.
- ReUI tier: free components only; no license is required.
- Registry consultation: the ReUI MCP was invoked on 2026-07-14, but its session returned `401 Unauthorized`. The official `shadcn search/view @reui` fallback and ReUI Base UI documentation were used to verify the components, examples, install commands, and Kanban/Filters tradeoffs below. Re-authenticate the MCP and run `reui_validate_usage` before implementation.

## Goal

Turn the current 650-line squad-group index and 993-line editor into one coherent squad-building workspace. Preserve group creation, discovery, invitations, role-based editing, placement constraints, visibility, sharing, save protection, and Effect atom behavior while improving hierarchy, loading isolation, assignment clarity, mobile behavior, and maintainability.

The result should feel like a guild formation desk: dark, compact, and roster-focused. It should make the relationship between available characters and destination squads obvious without becoming a horizontal project-management board, a generic SaaS card wall, or a decorative MMO skin.

## Functional Baseline

### Squad Group Index

The redesign must retain these behaviors:

- Create a named squad group and navigate to its returned `groupId`.
- Protect a non-empty creation input while creation is pending or navigation is attempted.
- Load owned, shared, and public squad groups independently.
- Show owned group name, character count, squad count, and last update time.
- Show shared/public owner identity, character count, squad count, last update time, and access context.
- Switch between `Moje`, `Udostępnione`, and `Publiczne` collections with accurate counts.
- Filter public groups by name and minimum/maximum level using the existing validation rules and API payload.
- List incoming editor invitations and accept or decline each one.
- Preserve toast feedback, atom refresh behavior, and retry actions.

The current shared-tab level controls do not affect `sharedSquadGroupsAtom`, and the shared summary protocol has no level fields. Do not preserve ineffective controls. Level filtering belongs only to the public tab unless the API contract is expanded in a separate change.

### Squad Group Editor

The redesign must retain these behaviors:

- Reject a route `groupId` that is not a positive safe integer without mounting group resources.
- Load group detail, saved squads, saved placements, available characters, editor grants, and invite targets.
- Hydrate a local draft without overwriting unsaved work when a resource refresh completes.
- Owner role: rename the group, add/delete/rename squads, change visibility, manage editors, change placements, and save the full group.
- Editor role: change placements in existing saved squads and save only character placement payloads.
- Viewer role: inspect public squad data without receiving mutating controls.
- Keep every character in at most one squad.
- Keep each squad at no more than 10 characters.
- Prevent two characters from the same Margonem account from occupying one squad.
- Preserve squad and character positions when building owner/editor save payloads.
- Add and remove characters with clear disabled reasons.
- Search verified users, send editor invitations, list pending/accepted grants, and revoke access.
- Preserve visibility, save, invite, revoke, loading, error, and toast behavior.
- Preserve dirty-form navigation protection while owner/editor changes are unsaved.

No API protocol, Effect atom contract, authorization rule, validation schema, or mutation behavior should change solely for the redesign.

## ReUI Consultation and Selection

Install ReUI components under `@/components/reui/*`, alongside shadcn primitives under `@/components/ui/*`. ReUI owns the operational surfaces and status language. Shadcn remains responsible for buttons, inputs, labels, avatars, dropdown menus, tabs, progress, separators, skeletons, and scroll areas.

| Component      | Responsibility across both routes                                                               | Documentation                                     | Preview                                 |
| -------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------- |
| `frame`        | Page sections, list panels, squad roster panels, character pool, visibility, and sharing        | https://reui.io/docs/components/base/frame        | https://reui.io/components/frame        |
| `autocomplete` | Verified-user search in editor access management                                                | https://reui.io/docs/components/base/autocomplete | https://reui.io/components/autocomplete |
| `alert`        | Invitation actions, resource failures, read-only context, placement rejection, and save failure | https://reui.io/docs/components/base/alert        | https://reui.io/components/alert        |
| `badge`        | Counts, visibility, access role, invitation status, and roster capacity                         | https://reui.io/docs/components/base/badge        | https://reui.io/components/badge        |
| `icon-stack`   | Instructional empty states for collections, squads, characters, and grants                      | https://reui.io/docs/components/base/icon-stack   | https://reui.io/components/icon-stack   |

Use these free examples as composition references. Copy their structure and replace demo content with typed application data.

| Example            | Use                                                 | Preview                                                  |
| ------------------ | --------------------------------------------------- | -------------------------------------------------------- |
| `c-autocomplete-9` | Rich verified-user results with avatars and actions | https://reui.io/preview/base/components/c-autocomplete-9 |
| `c-alert-3`        | Invitation/failure rows with responsive actions     | https://reui.io/preview/base/components/c-alert-3        |
| `c-icon-stack-1`   | Layered instructional empty states                  | https://reui.io/preview/base/components/c-icon-stack-1   |

### Components Evaluated but Not Selected

#### ReUI Kanban

ReUI Kanban and examples `c-kanban-3` and `c-kanban-4` were inspected:

- Documentation: https://reui.io/docs/components/base/kanban
- Preview: https://reui.io/components/kanban
- Frame-column example: https://reui.io/preview/base/components/c-kanban-3
- Stacked-frame example: https://reui.io/preview/base/components/c-kanban-4

Do not use Kanban in the initial redesign:

- The domain is constrained roster allocation, not movement through workflow states.
- A valid placement depends on destination capacity, same-account membership, role, and whether a squad is persisted.
- Dynamic squad counts would create a horizontally scrolling board at desktop and a poor source-to-destination model at 320 px.
- Pointer drag cannot replace explicit add/remove controls; a complete accessible alternative would leave two competing interaction models.
- The registry source currently uses an internal `any` context and exposes `onMove` in source while the public API table does not document it. This conflicts with the repository's no-`any` standard and must not be accepted by disabling lint rules or inventing props.

Keep explicit, keyboard-native placement actions. Reconsider Kanban only after ReUI publishes a type-safe documented constraint hook and user testing demonstrates that drag-and-drop improves this allocation task.

#### ReUI Filters

ReUI Filters and examples `c-filters-2` and `c-filters-9` were inspected:

- Documentation: https://reui.io/docs/components/base/filters
- Preview: https://reui.io/components/filters
- Validation example: https://reui.io/preview/base/components/c-filters-2
- I18n example: https://reui.io/preview/base/components/c-filters-9

Retain the existing Effect filter form instead:

- The public API expects one submitted payload with cross-field `minLevel <= maxLevel` validation.
- ReUI Filters is optimized for immediate chip/filter changes and per-field validation.
- Adapting it would duplicate existing Effect schemas or change submit semantics solely for appearance.
- Shared summaries cannot support the current level filter regardless of the UI component.

Place the existing Effect form inside a ReUI Frame toolbar and improve its responsive composition without replacing its state model.

#### ReUI Data Grid

Do not use DataGrid for squad-group collections. Each row is one navigation target with three to five compact values, no sorting, selection, pagination, expansion, or row actions. A semantic list inside stacked `FramePanel` rows is simpler and more usable on mobile.

### Installation

The current accounts redesign worktree already contains the selected ReUI components. If implementation starts on a branch where any are absent, run from `apps/web` and install only missing items:

```bash
pnpm dlx shadcn@latest add @reui/frame --yes
pnpm dlx shadcn@latest add @reui/autocomplete --yes
pnpm dlx shadcn@latest add @reui/alert --yes
pnpm dlx shadcn@latest add @reui/badge --yes
pnpm dlx shadcn@latest add @reui/icon-stack --yes
pnpm dlx shadcn@latest add tabs --yes
```

After installation:

1. Inspect generated files plus package/lockfile changes before page work.
2. Confirm `base-nova` generated Base UI variants and imports resolve to the established namespaces.
3. Re-authenticate the ReUI MCP, call `get_component` for every selected ReUI component, inspect `get_examples`, and run `reui_validate_usage` against planned props.
4. Do not edit generated ReUI internals or weaken type/lint rules to make a component fit.
5. If shadcn Tabs is already present by implementation time, reuse it rather than reinstalling.

## Shared Visual Direction

- Keep the existing dark-only theme, Inter body text, JetBrains Mono for counts/levels/timestamps, and Source Serif only for route-level `h1` headings.
- Use ReUI `Frame` and `FramePanel` tonal layering instead of shadows. Set `--frame-radius: var(--radius-lg)` at each page boundary.
- Use one restrained teal accent for primary actions, current tabs, focus, and selected destinations only.
- Use semantic ReUI badges/alerts for state. Do not add raw green, amber, or red utilities.
- Keep Lucide outline icons. Motion Icons are premium and remain out of scope.
- Preserve compact operational density with clear row dividers and deliberate larger gaps only between workflows.
- Do not add gradients, glass, side stripes, oversized metrics, repeated icon-card grids, or fantasy ornament.
- Motion is state feedback only, 150 to 200 ms. Inline creation, tab content, and collapsible access details must remain visible when reduced motion disables transitions.

## Route 1: Squad Group Index

### Information Architecture

Replace the nested page-wide async boundaries and scattered bordered blocks with independent task sections:

```text
Page heading                                      [Nowa grupa]

[ Inline create Frame, only while creating ]

[ Invitation Frame, only while loading/failing/pending ]
  invitation rows with owner, group, time, actions

[ Group library Frame ]
  Moje | Udostępnione | Publiczne
  public-only Effect filter toolbar
  loading / failure / empty / group rows
```

This keeps discovery as the primary persistent surface, makes creation progressive without using a modal, and prevents one failed resource from blanking unrelated successful content.

### 1. Page Header and Inline Creation

- Keep `h1` as `Składy` and the current concise purpose statement.
- Increase the maximum width to approximately `max-w-7xl` to align with the account workspace and future editor width.
- Use one `Nowa grupa` primary button in the header. It reveals a compact inline ReUI Frame immediately below, never a dialog.
- Move the existing controlled name input and submit behavior into the inline frame.
- Focus the input when the frame opens. `Escape` may close only when the input is empty and creation is idle.
- Keep the 80-character limit, trim-before-submit behavior, pending state, toast feedback, and navigation to the returned group.
- Keep `useEffectFormProtection` active only for a non-empty draft and preserve the draft after a failed create request.
- On narrow screens, the input and actions become full width. Do not hide the submit label behind an icon-only control.

### 2. Invitation Frame

- Give invitations their own resource boundary rather than nesting them inside all group resources.
- While initial/loading, render two skeleton rows at the final row height.
- On failure, show a destructive ReUI `Alert` with a retry action; keep the library usable.
- When loaded and empty, omit the entire section. Do not spend permanent vertical space saying there are no invitations.
- When pending invitations exist, use one ReUI Frame with compact alert-like rows based on `c-alert-3`.
- Show owner avatar/name, group name, invitation timestamp, and a warning-light pending badge.
- Track `respondingInvitationId`, not a fake page-global `isPending: false`. Only the affected invitation's actions are disabled.
- Accept is primary; decline is a quiet action. Preserve mutation toasts and refresh behavior.
- Announce the result once through toast; do not duplicate it in an assertive live region.

### 3. Group Library Frame

- Use one ReUI Frame with a single `FramePanel` and no nested Card components.
- Put shadcn Tabs in the panel header with counts for `Moje`, `Udostępnione`, and `Publiczne`.
- Use real tab triggers/panels with IDs, `aria-controls`, keyboard arrow navigation, and focus management from the installed Base UI implementation.
- Keep tab state local. Do not fetch conditionally unless product data shows the eager requests are costly; all three counts are useful in the tab bar.
- Give owned, shared, and public resources independent loading, failure, empty, and retry states inside their tab panel.
- Do not let failure in an inactive collection replace the header, invitations, create flow, or active successful collection.

Group rows use one shared semantic composition:

| Region  | Owned                | Shared              | Public              |
| ------- | -------------------- | ------------------- | ------------------- |
| Primary | Group name           | Group name          | Group name          |
| Owner   | Current user omitted | Avatar + owner name | Avatar + owner name |
| Counts  | Squads + characters  | Squads + characters | Squads + characters |
| Status  | `właściciel`         | `edytor`            | `publiczny`         |
| Time    | Last update          | Last update         | Last update         |
| Action  | Entire row link      | Entire row link     | Entire row link     |

- Use a real TanStack Router `Link` as the row's main navigation target.
- Keep count and timestamp values in mono/tabular numerals.
- Use ReUI badges for role and counts; do not make every value a pill.
- Show a trailing chevron as a navigation cue, marked decorative.
- Give each link a visible focus state and an accessible name containing the group name.
- Keep owner/avatar metadata below the name on small screens and in a stable middle column on larger screens.
- Do not use truncate as the only treatment for group/user names. Allow wrapping at mobile and constrain only genuinely secondary metadata.

### 4. Public Filters

- Render filters only in the `Publiczne` tab because only `globalSquadGroupsAtom` accepts the level/name payload.
- Keep `squadFilterForm`, `OptionalLevelSchema`, `SquadFilterNameSchema`, and `validateSquadFilterLevelOrder`.
- Use a compact Frame toolbar with name, minimum level, maximum level, apply, and clear controls.
- Preserve explicit apply semantics. Do not request on every keystroke.
- Keep disposable filter input exempt from route dirty protection.
- Show active-filter status and filtered empty copy without adding summary metric cards.
- Keep the previous successful public list visible while a new filter request waits if the Effect resource semantics support it; otherwise use row skeletons, not a centered spinner.
- Reset both field state and applied atom parameters on `Wyczyść`.

### 5. Index Empty, Loading, and Failure States

- Use ReUI `IconStack` for instructional empty states in each tab.
- Owned empty state points to `Nowa grupa` and focuses the creation input.
- Shared empty state explains that accepted editor invitations appear here.
- Public empty state distinguishes no published groups from no filter matches.
- Skeletons must match the final row structure and remain `aria-hidden`.
- ReUI destructive Alerts contain the affected operation and a labelled retry button.

## Route 2: Squad Group Editor

### Information Architecture

Keep the source-and-destination relationship visible on wide screens, but remove sharing from the character sidebar:

```text
[ Editor command header ]
  back | group name | role + visibility | dirty status | save

[ Role/read-only or save error Alert, only when relevant ]

[ Formation workspace ]
  left: squads in responsive Frame panels
  right: sticky available-character Frame

[ Owner settings: stacked Frame ]
  visibility
  editor access
```

The character pool and squads remain side by side only where both are readable. Editor access moves below the formation task so invitation controls no longer compete with character assignment.

### 1. Resource Boundary and Route Errors

- Keep positive-safe-integer validation before rendering `SquadBuilderEditorContent`.
- Render invalid ID and detail-load failures as full-width ReUI destructive Alerts with a real link back to `Składy`.
- Use a page-shaped skeleton for the initial detail load: command header, two roster panels, and character pool.
- After detail succeeds, mount placement-only resources only for `owner` or `editor`. A viewer must not fetch or expose available-character assignment UI.
- Grants and invite-target resources belong only to the owner settings component.
- A failure in available characters or grants must not erase already loaded squad detail.

### 2. Editor Command Header

- Use a real back `Link`, not an imperative navigation button.
- Present owner group-name editing as the page `h1` field with a visible `Nazwa grupy` label. Non-owners see a text `h1`, not input-styled read-only content.
- Show one ReUI role badge: `właściciel`, `edytor`, or `tylko odczyt`.
- Show one visibility badge: `prywatna` or `publiczna`.
- Keep the save action in a stable right-side command area on desktop and a full-width sticky-bottom action bar on touch layouts if the normal header scrolls out of view.
- Disable save only for no changes, active save, invalid empty owner name, or read-only role.
- Expose `Niezapisane zmiany`, `Zapisywanie`, and `Zapisano` through one polite status region.
- Preserve the current draft after save failure and show an in-context destructive Alert near the save command in addition to concise toast feedback only if both messages provide different recovery value.

### 3. Squad Roster Workspace

- Render squads as a responsive one-column/two-column set of ReUI Frames. Do not use shadcn Card.
- Each squad uses a stable key: persisted `squadId` or generated `clientKey`.
- Owner sees an editable squad name and delete action. Editor/viewer sees a heading.
- Show a mono capacity value such as `7/10` in a ReUI badge and a slim accessible progress indicator.
- Keep roster order equal to the draft character array; save payload position comes from that order.
- Character rows show avatar, name, level, profession, account display name, and account owner where shared ownership matters.
- Owner/editor gets a labelled remove control. Viewer receives no disabled mutation controls.
- Missing character metadata remains visible as `Niedostępna postać` with its stable character ID; never silently remove it from the draft.
- Empty roster copy explains how to add from the adjacent/preceding character pool.
- `Dodaj skład` is owner-only and appears once in the section header, not repeated in every panel.
- The all-empty group uses ReUI `IconStack` plus the owner action. Editor/viewer empty copy reflects that they cannot create squads.

Do not add squad drag-reordering in this redesign. The current UI has no reorder behavior, and introducing an inaccessible second placement model is outside parity scope.

### 4. Available Character Pool

- Keep the pool in a ReUI Frame that is sticky within the desktop viewport and in normal document flow below the command header on smaller layouts.
- Add a local text search over character name, profession label, account display name, and owner name. This is ephemeral client state and does not change the API.
- Group rows by account identity to make the one-character-per-account rule understandable before the user attempts an invalid placement.
- Keep all available characters visible, including currently selected characters. Selected rows show the current squad in a secondary badge.
- Replace the growing row of one button per squad with one shadcn Dropdown Menu labelled `Przypisz do składu`.
- Destination menu items show squad name and capacity. Disable a destination that is full or already contains a character from the same account, with a visible reason in the menu item or adjacent description.
- Selecting another valid destination moves an already selected character atomically. Selecting its current squad is a no-op.
- Include a `Usuń ze składu` action for selected characters so the same capability is available from either side of the workspace.
- Run menu and roster actions through the same pure placement function so pointer and keyboard paths cannot diverge.
- If no characters exist, use `IconStack`, explain that Jaruna accounts supply the pool, and link to `/dashboard/squad-builder/accounts`.
- If search has no matches, show a compact search-empty message and clear-search action, not the first-use empty state.
- If the resource fails, show a local ReUI Alert with retry while saved squad rosters remain usable for review/removal.

### 5. Placement Rules and Feedback

Represent expected placement rejection as data, not thrown errors:

```ts
type PlacementError =
  | { readonly _tag: "readOnly" }
  | { readonly _tag: "unknownCharacter"; readonly characterId: number }
  | { readonly _tag: "unknownSquad"; readonly squadKey: string }
  | { readonly _tag: "squadFull"; readonly squadName: string }
  | {
      readonly _tag: "accountAlreadyRepresented";
      readonly squadName: string;
      readonly accountDisplayName: string;
    };

type PlacementResult =
  | { readonly _tag: "success"; readonly draft: SquadGroupDraft }
  | { readonly _tag: "failure"; readonly error: PlacementError };
```

- Disable known-invalid destination actions before submission.
- Keep the pure guard in the state transition even when the UI is disabled; UI state is not a correctness boundary.
- Convert rejection values into direct Polish messages naming the character/account and destination squad.
- Use a polite inline status for keyboard assignment feedback. Reserve toast for persistence outcomes, not every local move.

### 6. Owner Settings Frame

Use one stacked ReUI Frame with two `FramePanel` sections. Do not hide editor access inside a collapsible sidebar.

Visibility panel:

- Keep the existing private/global protocol values.
- Use a labelled fieldset with two clear options and concise consequences.
- Disable only the selected value and the control while its mutation waits.
- Keep group header visibility in sync after success; preserve the prior value after failure.
- Announce the successful visibility change politely and keep existing toast error recovery.

Editor access panel:

- Reuse ReUI Autocomplete composition from `c-autocomplete-9` and the accounts sharing panel.
- Add a 250 ms debounce and retain the two-character minimum before mounting useful search results.
- Map each result to stable `userId`, avatar, name, and invite action.
- Use `AutocompleteList`'s render function and the installed Base UI props; do not map arbitrary children or invent a loading prop.
- Show query guidance, search loading, no matches, and failures inside the portalled autocomplete content or adjacent local Alert.
- Track `sendingUserId` and `revokingInvitationId` so unrelated users/grants remain actionable.
- List pending and accepted grants as compact avatar rows with semantic ReUI badges.
- Keep revoke actions labelled with the user name and preserve refresh/toast behavior.
- Empty grants explain that invited editors can change placements but cannot rename, create/delete squads, change visibility, or manage access.

Editors and viewers do not render owner settings. Instead, one concise info Alert near the command header explains their effective permissions.

## State Model

Keep server state in Effect atoms. Keep the editable draft and ephemeral interaction state in React feature components.

Recommended draft boundary:

```ts
interface SquadGroupDraft {
  readonly groupId: number;
  readonly name: string;
  readonly squads: readonly DraftSquad[];
}

interface DraftSquad {
  readonly clientKey: string;
  readonly squadId?: number;
  readonly name: string;
  readonly characters: readonly DraftCharacter[];
}

interface DraftCharacter {
  readonly characterId: number;
}
```

Array order is the source of truth for payload `position`; do not store duplicate position fields in the editable draft. Protocol projection adds positions at the save boundary.

Additional rules:

- Hydrate `SquadGroupDraft` from detail only when the local draft is clean or the group identity changes.
- Keep a clean saved snapshot and derive dirty state by domain equality or explicit successful transitions; do not scatter `setIsDirty(true)` across controls.
- Owner payload projection includes names, client keys, optional persisted IDs, squad positions, and character positions.
- Editor payload projection includes only persisted `squadId` values and character positions. New squad state must be unrepresentable for editors.
- Build `availableById`, selected-character lookup, account membership, and destination eligibility from typed draft/detail data.
- Use API IDs as list keys. Generated `clientKey` is valid only for unsaved squads.
- Keep independent pending state for save, visibility, invite target, and revoke target. Do not force unrelated mutations into one global action union.
- Expected placement failures are values; network/framework failures continue through the existing mutation error boundaries.

## File Decomposition

Keep both route files as composition roots and move workflow logic into local feature directories:

```text
apps/web/src/pages/dashboard/squad-builder/
  squads.tsx
  squads/
    create-squad-group-frame.tsx
    squad-group-invitations.tsx
    squad-group-library.tsx
    squad-group-presenters.ts
    squad-group-presenters.test.ts
  squad-editor.tsx
  squad-editor/
    squad-editor-command-header.tsx
    squad-roster-workspace.tsx
    available-character-pool.tsx
    squad-group-settings.tsx
    squad-group-draft.ts
    squad-group-draft.test.ts
```

Responsibilities:

- `squads.tsx`: compose header, creation, invitations, and library; own only active-tab/open-create state.
- `create-squad-group-frame.tsx`: own creation input, form protection, mutation, pending state, and post-create navigation.
- `squad-group-invitations.tsx`: own invitation resource boundary and per-invitation response state.
- `squad-group-library.tsx`: own tabs, public Effect filter form, independent collection boundaries, and group rows.
- `squad-group-presenters.ts`: own pure summary-to-row projection and Polish count/status/time labels shared across collections.
- `squad-editor.tsx`: validate route input, load detail, choose the role-specific editor shell, and handle page-level detail states.
- `squad-editor-command-header.tsx`: own name editing, role/visibility status, save command, and dirty announcement.
- `squad-roster-workspace.tsx`: render squad frames and roster actions from typed draft operations.
- `available-character-pool.tsx`: own local search, account grouping, destination menu, and available-resource states.
- `squad-group-settings.tsx`: own owner-only visibility, debounced autocomplete, grants, invite, and revoke interactions.
- `squad-group-draft.ts`: own draft hydration, placement validation/transitions, role-safe payload projection, and equality.
- `squad-group-draft.test.ts`: verify domain constraints and payload order without adding a React test dependency.

Do not add barrel exports. Keep a helper in its component module when it has one caller.

## Theme Integration

The accounts redesign already added the semantic ReUI tokens used here to `src/index.css`:

- `--success` / `--success-foreground`
- `--info` / `--info-foreground`
- `--warning` / `--warning-foreground`
- `--invert` / `--invert-foreground`

Do not add page-specific tokens. Confirm these exist in `:root`, `.dark`, and `@theme inline`; add only missing tokens if implementation occurs independently from the accounts work.

Do not change global radius, typography, background, primary, destructive, or shadow tokens for these pages. Do not use the ReUI `focus` badge variants unless matching focus tokens are deliberately added at the design-system level.

## Responsive Behavior

- Mobile first: one column, full-width creation/filter controls, and no fixed-height page panels.
- Test both pages at 320, 375, 768, 1024, and 1440 px.
- Index tab triggers may scroll horizontally only inside their own labelled tab-list container; page-level horizontal overflow is not acceptable.
- Group rows stack identity, metadata, and status without hiding names behind truncation.
- Public filter fields use one column at 320 px, two columns where useful, and the current compact desktop row only when labels remain readable.
- Editor command actions wrap below the identity at mobile. Keep save reachable without covering content or safe-area insets.
- Formation workspace becomes one column below `xl`; place the available pool before roster panels on mobile so assignment starts from a visible source.
- At desktop, the character pool may be sticky with a viewport-relative maximum height and its own ReUI/shadcn scroll area.
- Squad panels use one column below `lg` and two columns above it. A third column is not required because roster rows become too narrow.
- Dropdown and autocomplete content must portal outside scroll/overflow surfaces.
- Interactive targets remain at least 40 px high on touch layouts.
- Long Polish labels, group/squad names, character names, owner names, and account names must wrap without escaping their surfaces.

## Accessibility and Security

- Preserve one `h1` per route. Section headings use `h2`; squad names use `h3`.
- Use semantic lists for group, invitation, grant, character, and roster collections.
- Every icon-only retry, delete, remove, back, clear, and menu control gets a contextual Polish accessible name.
- Decorative icons and `IconStack` artwork use `aria-hidden="true"`.
- Every non-submit button explicitly uses `type="button"`.
- Use real links for route navigation and the account-page empty-state recovery path.
- Associate every input with a visible label and existing Effect Form error IDs.
- Announce collection loading/results, assignment results, dirty/save state, and autocomplete results without duplicating toast output.
- Preserve visible focus rings and keyboard order in Tabs, dropdown assignment, Autocomplete, invitation actions, and save controls.
- Disabled destination items must expose the reason in text, not color or tooltip alone.
- Do not rely on drag-and-drop for any placement behavior.
- Render API strings as React text. Do not add `dangerouslySetInnerHTML`.
- Respect reduced motion for inline creation, tab transitions, menu/popover transitions, and status changes.

## Implementation Sequence

1. **Install only missing primitives.** Review generated ReUI/shadcn files and dependencies after each command; confirm no unrelated existing components are overwritten.
2. **Extract pure squad-group presenters.** Move row projection/count/status labels and add focused Vitest coverage before changing markup.
3. **Isolate index resources.** Remove nested page-wide boundaries, give invitations and each collection their own loading/failure/retry state, and verify behavior before visual replacement.
4. **Build the group library Frame.** Add Tabs, shared row composition, instructional empty states, and public-only Effect filters.
5. **Build inline creation and invitation Frames.** Preserve form protection, navigation, per-invitation pending state, toasts, and refreshes.
6. **Extract the editor draft domain.** Implement hydration, equality, placement constraints, owner/editor payload projection, and unit tests while current UI remains connected.
7. **Build the editor command header.** Wire role/visibility badges, owner naming, dirty status, save behavior, and route recovery.
8. **Build roster Frames.** Replace squad cards with role-aware Frame panels using the pure draft operations.
9. **Build the available-character pool.** Add local search, account grouping, destination menu, atomic moves, and isolated async states.
10. **Build owner settings.** Move visibility and editor access into a stacked Frame; reuse the documented Autocomplete composition and target-specific pending state.
11. **Remove obsolete markup/state.** Delete replaced Collapsible/sidebar sharing markup, fake mutation wrappers, duplicate position state, and redundant skeletons only after parity is verified.
12. **Responsive and accessibility pass.** Verify headings, keyboard order, focus, announcements, portal clipping, long text, touch targets, and reduced motion.
13. **ReUI and repository checks.** Run the ReUI audit checklist, usage validation, focused tests, typecheck, Ultracite, and production build.

Each step must leave both routes runnable. Do not rewrite both 1,600+ lines in one unverified change.

## Verification Matrix

### Automated

Run from the repository root:

```bash
pnpm exec vitest run apps/web/src/pages/dashboard/squad-builder/squads/squad-group-presenters.test.ts apps/web/src/pages/dashboard/squad-builder/squad-editor/squad-group-draft.test.ts apps/web/src/lib/squad-builder/squad-group-atoms.test.ts apps/web/src/lib/squad-builder/sharing-atoms.test.ts
pnpm --filter web check-types
pnpm check
pnpm --filter web build
```

### Manual: Index

- Owned/shared/public resources in initial, loading, success, empty, and failure states independently.
- Open/cancel creation with empty input, dirty input, pending request, failure, and success navigation.
- Long and duplicate-looking group names; zero/one/many squads and characters.
- Public filters: no filters, name only, min only, max only, valid range, reversed range, invalid values, no matches, and clear.
- Confirm shared tab has no ineffective level filter controls.
- No invitations, one invitation, multiple invitations, response failure, and response success.
- Responding to one invite must not disable unrelated invites.
- Keyboard-only tabs, create flow, filters, rows, invitation actions, and retries.

### Manual: Editor

- Invalid, missing, inaccessible, and valid `groupId` routes.
- Owner, editor, and viewer roles with exactly their permitted controls.
- Zero squads, one squad, many squads, empty roster, and full 10-character roster.
- Add, remove, and move a character; preserve order in the save payload.
- Reject an 11th character, duplicate character placement, and a second character from the same account.
- Remove a squad containing characters and verify those characters remain available.
- Missing character metadata remains visible and removable by permitted roles.
- Dirty navigation, save success, save failure, refreshed detail while dirty, and repeated save prevention.
- Private/global visibility success and failure.
- Available characters initial/loading/failure/empty/search-no-results states without hiding saved rosters.
- Invite search below two characters, debounced loading, no results, results, send success/failure, and keyboard selection.
- Pending/accepted grants, revoke success/failure, and target-specific disabled states.
- Long group, squad, character, account, and owner names at every target viewport.
- Screen-reader announcements without duplicate stale messages.

## Acceptance Criteria

- Both routes retain all functional-baseline behavior with unchanged API and atom contracts.
- Every major surface uses ReUI Frame; no top-level shadcn Card remains on either route.
- Index resources fail and retry independently; one failed collection does not blank the page.
- Public filters preserve Effect validation/apply semantics and no ineffective level filter appears for shared groups.
- Invitation responses disable only the affected invitation.
- Owner, editor, and viewer controls match protocol authorization exactly.
- All placement entry points use one tested pure transition that enforces uniqueness, capacity, and same-account rules.
- Character placement remains fully operable with keyboard-native controls and no drag requirement.
- Available-character or grant failures do not hide loaded squad rosters.
- User invitation search uses ReUI Autocomplete with debounce, loading, no-results, portal, keyboard, and screen-reader behavior.
- The route files are readable composition roots with feature-local modules and no barrel exports.
- No content or page-level horizontal overflow occurs at 320 px.
- Focus order, labels, announcements, semantic headings/lists, touch targets, and reduced motion meet accessibility requirements.
- Focused tests, web typecheck, Ultracite check, production build, ReUI usage validation, and ReUI audits pass.

## Explicit Non-Goals

- Changing squad-group APIs, protocol schemas, atom contracts, authorization, or validation limits.
- Adding group deletion, cloning, templates, pagination, sorting, or bulk actions.
- Adding drag-and-drop or squad reordering before ReUI exposes a documented type-safe constrained API and the interaction is user-validated.
- Adding server-side filters for shared groups without corresponding protocol fields.
- Replacing Effect forms with ReUI Filters solely for visual consistency.
- Replacing all shadcn primitives when ReUI has no equivalent.
- Installing premium ReUI blocks or Motion Icons.
- Redesigning the accounts page or dashboard navigation in the same change.
- Introducing light mode, new fonts, custom illustrations, or page-specific raw color palettes.

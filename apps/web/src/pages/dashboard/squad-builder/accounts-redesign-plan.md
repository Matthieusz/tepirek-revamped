# Accounts Page ReUI Redesign Plan

## Status

- Planning only. Do not install or change runtime code as part of this document.
- Target: `apps/web/src/pages/dashboard/squad-builder/accounts.tsx`
- Route: `/dashboard/squad-builder/accounts`
- UI base: Base UI through shadcn `base-nova`
- Surface decision: use ReUI `Frame` consistently. Do not mix ReUI Frame and shadcn Card as top-level surfaces on this page.
- Package manager: pnpm 11
- ReUI tier: free components only; no license is required.

## Goal

Turn the current 1,509-line card-based page into a focused account workspace built from ReUI components. Preserve every existing account-import, refetch, sharing, invitation, and error-handling capability while improving hierarchy, progressive disclosure, loading states, mobile behavior, and maintainability.

The result should feel like a compact guild account ledger: dark, structured, data-forward, and consistent with the existing Tepirek theme. It must not become a generic SaaS card wall or a decorative MMO skin.

## Functional Baseline

The redesign must retain these behaviors:

- Paste and validate up to `MAX_PROFILE_URLS` Margonem profile URLs.
- Preview successful and failed imports by source line.
- Edit each successful import's display name and confirm it independently.
- Clear the import form and all preview results.
- Load owned accounts and show profile ID, profile link, character count, and last fetch time.
- Preview an account refetch before applying it.
- Show added, removed, changed, and unchanged character counts and details.
- Warn that removed characters are also removed from saved squads.
- Apply or dismiss a refetch preview.
- Search verified users, send account access invitations, list grants, and revoke access.
- Load incoming invitations and accept or decline each one.
- Load accounts shared with the current user.
- Preserve Effect form protection, atom refresh behavior, toast feedback, and section-level retries.

No API protocol, atom contract, validation schema, or mutation behavior should change solely for the redesign.

## ReUI Selection

Install ReUI components under `@/components/reui/*`, alongside the existing shadcn components under `@/components/ui/*`. ReUI provides the composed operational surfaces; shadcn remains the dependency for primitives ReUI does not replace, including buttons, textareas, avatars, labels, dropdown menus, and skeletons.

| Component      | Page responsibility                                                                            | Documentation                                     | Preview                                 |
| -------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------- |
| `frame`        | All major page sections and grouped account-access panels                                      | https://reui.io/docs/components/base/frame        | https://reui.io/components/frame        |
| `stepper`      | Two-stage import flow: profile input, then review and save                                     | https://reui.io/docs/components/base/stepper      | https://reui.io/components/stepper      |
| `data-grid`    | Owned account ledger with loading, empty, and expandable rows                                  | https://reui.io/docs/components/base/data-grid    | https://reui.io/components/data-grid    |
| `autocomplete` | Search and select verified users to invite                                                     | https://reui.io/docs/components/base/autocomplete | https://reui.io/components/autocomplete |
| `alert`        | Import failures, refetch warnings, failures, and invitation rows where actions need prominence | https://reui.io/docs/components/base/alert        | https://reui.io/components/alert        |
| `badge`        | Character counts and pending, accepted, success, and warning states                            | https://reui.io/docs/components/base/badge        | https://reui.io/components/badge        |
| `icon-stack`   | Instructional empty states without introducing custom illustrations                            | https://reui.io/docs/components/base/icon-stack   | https://reui.io/components/icon-stack   |

Use these free examples as the composition references. Copy their component structure, then replace demo data and copy with typed application data.

| Example            | Use                                       | Preview                                                  |
| ------------------ | ----------------------------------------- | -------------------------------------------------------- |
| `c-data-grid-8`    | Expandable owned-account rows             | https://reui.io/preview/base/components/c-data-grid-8    |
| `c-stepper-10`     | Controlled stepper with content per stage | https://reui.io/preview/base/components/c-stepper-10     |
| `c-autocomplete-9` | Autocomplete with rich search results     | https://reui.io/preview/base/components/c-autocomplete-9 |
| `c-alert-3`        | Alert with action buttons                 | https://reui.io/preview/base/components/c-alert-3        |
| `c-icon-stack-1`   | Layered empty-state icon                  | https://reui.io/preview/base/components/c-icon-stack-1   |

### Installation

Run from `apps/web`. Install each item separately so generated diffs and dependency collisions can be reviewed after every command.

```bash
pnpm dlx shadcn@latest add @reui/frame --yes
pnpm dlx shadcn@latest add @reui/data-grid --yes
pnpm dlx shadcn@latest add @reui/stepper --yes
pnpm dlx shadcn@latest add @reui/autocomplete --yes
pnpm dlx shadcn@latest add @reui/alert --yes
pnpm dlx shadcn@latest add @reui/icon-stack --yes
```

`data-grid` installs ReUI `badge` transitively. Confirm that imports resolve to `@/components/reui/badge` and that the existing `@/components/ui/badge` remains intact. Do not overwrite or move existing shadcn components just to normalize paths.

After installation:

1. Inspect every generated file and the package/lockfile diff.
2. Confirm ReUI files live under `src/components/reui` and reusable shadcn dependencies remain under `src/components/ui`.
3. Re-read the installed TypeScript APIs before wiring controlled autocomplete behavior. Use only props exposed by the installed Base UI variant.
4. Do not edit generated ReUI component internals to fit this page. Adapt through documented props, composition, semantic tokens, and feature-owned wrappers.

## Information Architecture

Use a single-column task sequence instead of the current permanent `main + 22rem sidebar` split. The current split squeezes import previews and treats invitations as equally important as the primary account workflow.

```text
Page heading and concise description

[ Import kont: Frame + controlled Stepper ]
  1. Wklej profile
  2. Sprawdź i zapisz

[ Twoje konta: Frame + expandable DataGrid ]
  account | characters | last fetch | profile | actions
  expanded row: refetch preview + sharing management

[ Dostęp do kont: stacked Frame ]
  incoming invitations
  accounts shared with me
```

This ordering follows task frequency: add accounts, maintain owned accounts, then handle access received from others. It keeps the account grid wide enough for useful data and removes nested card layouts.

## Visual Direction

- Keep the existing dark-only theme, Inter body text, JetBrains Mono for profile IDs, levels, counts, and timestamps, and Source Serif only for the page heading.
- Use `Frame` and `FramePanel` tonal layering instead of shadows. Set `--frame-radius: var(--radius-lg)` at the page frame boundary.
- Use one restrained teal accent for primary actions and selection. Accent is functional, not decorative.
- Use ReUI semantic badge/alert variants for statuses rather than raw green, amber, or red utilities.
- Keep Lucide outline icons throughout. Motion Icons are premium and are intentionally out of scope.
- Do not add gradients, glass effects, side-stripe accents, oversized metrics, or repeated icon-card grids.
- Keep operational density: compact headers, `gap-0.5` between title and description, and larger gaps only between workflows.
- Use state motion only, between 150 and 200 ms. Step and expanded-row transitions must respect `prefers-reduced-motion` and content must remain visible when animation does not run.

## Page Composition

### 1. Page Header

- Keep `h1` as `Konta Margonem` and the existing one-sentence purpose statement.
- Increase the page width to approximately `max-w-7xl` so the data grid has room, but retain the dashboard's horizontal padding.
- Do not add summary metric cards. Counts belong in section headers or badges.

### 2. Import Frame

Use one `Frame` containing one `FramePanel`. The header contains the title, direct helper copy, and no decorative action.

Build a controlled two-step ReUI `Stepper`:

- Step 1, `Wklej profile`: render the existing `accountPreviewForm`, `ProfileUrlsField`, validation feedback, submit button, and URL limit helper.
- Step 2, `Sprawdź i zapisz`: render preview results and independent confirmation forms.
- On a successful preview response, map API results exactly as today, store the typed preview items, and move to step 2.
- On validation or request failure, remain on step 1 and expose the existing form feedback.
- Going back to step 1 must not silently discard preview results. Only `Wyczyść` or `Zacznij od nowa` resets form and preview state.
- Mark the active step as loading while the preview request is waiting. Disable invalid forward navigation.

Preview result treatment:

- Render failed lines as ReUI destructive `Alert` rows with line number, input URL, and the existing Polish error message.
- Render successful lines as compact ledger rows with account name, profile ID, character count badge, and Jaruna character summary.
- Keep each successful row's Effect confirmation form and its own pending state.
- Use an `aria-live="polite"` status summary such as `3 konta gotowe, 1 błąd` after preview completion.
- After the last successful result is confirmed, show a compact success state with `Dodaj kolejne konta`. Do not leave an empty step panel.
- Failed lines remain visible until the user clears or reruns the preview.

### 3. Owned Accounts Frame

Use ReUI `DataGrid` inside a `FramePanel`. Build the TanStack table with `useReactTable`; do not pass invented `data` or `columns` props to `DataGrid`.

Required table setup:

- `getCoreRowModel()` for normal rows.
- `getExpandedRowModel()` following `c-data-grid-8`.
- Stable `getRowId: account => String(account.accountId)`.
- `recordCount={accounts.length}`.
- `isLoading` driven by `ownedAccountsResult`.
- `loadingMode="skeleton"`.
- A typed custom `emptyMessage` using `IconStack`, explanatory copy, and a control that focuses or scrolls to the import textarea.
- `tableLayout` should use row borders, no cell borders, no striping, and an auto width only if the installed example confirms it remains readable.

Columns:

| Column           | Content                                                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| Expand           | Accessible chevron button with expanded state and account name in its label           |
| Konto            | Display name as the primary value; profile ID in mono beneath it                      |
| Postacie         | ReUI badge with localized character count                                             |
| Ostatnio pobrano | Formatted timestamp in mono                                                           |
| Profil           | Real external anchor with `rel="noopener noreferrer"`                                 |
| Akcje            | Labelled refresh and sharing controls, or a conventional action menu on narrow widths |

Expanded row content:

- Follow the expandable row structure from `c-data-grid-8`; do not simulate expansion with a second unrelated card.
- Use a responsive two-column detail area at desktop and one column below `lg`.
- Left side: refetch controls and the current preview diff.
- Right side: account sharing autocomplete and current grants.
- Keep detail content inside the expanded table region and avoid nested Card or Frame components.

Refetch details:

- `Odśwież dane` starts the existing preview mutation and announces progress.
- Present the result summary with semantic badges for added, removed, changed, and unchanged counts.
- Use a warning/destructive ReUI `Alert` when removals affect saved squads.
- Preserve detailed changed-field output and `changeFieldLabel`/`formatChangeValue` behavior.
- `Zastosuj zmiany` remains primary; `Nie teraz` clears only the preview.
- Prevent duplicate preview/apply submissions per account without disabling unrelated account rows.

Sharing details:

- Replace the manual search input/results list with ReUI `Autocomplete` based on `c-autocomplete-9`.
- Retain the 250 ms debounce and minimum two-character query.
- Map each API target to a typed item with a stable user ID, avatar, display name, and an invite action.
- Use `AutocompleteList`'s render prop; do not map arbitrary children into it.
- Show search loading and no-results states inside the autocomplete content and announce them politely.
- Keep current grants below a separator as compact avatar rows with ReUI status badges.
- Track sending/revoking state by target or access ID so one mutation does not disable every row.

### 4. Account Access Frame

Use a stacked `Frame` with two `FramePanel` sections rather than two separate cards.

Incoming invitations:

- Place the pending count in a ReUI warning-light badge in the panel header.
- Render each invite with owner avatar, account name, inviter name, and accept/decline actions.
- Use the `c-alert-3` action composition when an invitation needs emphasis, but keep neutral styling until the user acts.
- Track the responding access ID instead of one global boolean so unrelated invites remain actionable.
- Preserve success/error toasts and atom refresh behavior.

Shared accounts:

- Render a compact list, not a second data grid; this data is read-only and has only four fields.
- Show display name, owner avatar/name, character count badge, profile link, profile ID, and last fetch time.
- Use real anchors and preserve external-link security attributes.

Both panels:

- Use ReUI `IconStack` empty states that explain how access is obtained.
- Use skeleton rows while loading, not a centered spinner.
- Keep failures inside the affected `FramePanel` using a destructive ReUI `Alert` with a retry action. Do not replace the entire page or adjacent successful panels.

## State Model

Keep server state in the current Effect atoms. Keep only ephemeral interaction state in React.

Recommended local state:

```ts
type ImportStep = 1 | 2;

type PendingAccountAction =
  | { readonly _tag: "idle" }
  | { readonly _tag: "previewingRefetch"; readonly accountId: number }
  | { readonly _tag: "applyingRefetch"; readonly accountId: number }
  | {
      readonly _tag: "sendingInvite";
      readonly accountId: number;
      readonly userId: string;
    }
  | { readonly _tag: "revokingAccess"; readonly accessId: number }
  | { readonly _tag: "respondingToInvite"; readonly accessId: number };
```

Do not force all mutations into one page-global action if independent actions can safely overlap. Prefer action state owned by the row or panel that performs the mutation. The discriminated union is useful only within an owner that truly permits one action at a time.

Additional rules:

- Preserve `PreviewItem` as a success/error discriminated union.
- Keep form submission state sourced from Effect Form rather than duplicating it in React.
- Derive loading and count values from `AsyncResult`, not copied state.
- Reset stepper and preview state only through an explicit import reset function.
- Keep stable IDs from API records as React keys. Never use array indices for interactive data.

## File Decomposition

The route file should become a composition root rather than retaining every form, query, and row implementation.

```text
apps/web/src/pages/dashboard/squad-builder/
  accounts.tsx
  accounts/
    account-import-frame.tsx
    account-access-frame.tsx
    account-sharing-panel.tsx
    owned-accounts-grid.tsx
    account-presenters.ts
    account-presenters.test.ts
```

Responsibilities:

- `accounts.tsx`: read top-level owned-account state, own import preview state, compose the three page sections, and preserve page-level retries.
- `account-import-frame.tsx`: own both Effect form definitions, the ReUI stepper, preview rows, and import reset/confirmation UI.
- `owned-accounts-grid.tsx`: own TanStack columns, expansion, refetch preview/apply UI, and account-row action state.
- `account-sharing-panel.tsx`: own debounced target search, autocomplete mapping, grants, send, and revoke interactions.
- `account-access-frame.tsx`: own incoming invitations and shared-account read-only panels.
- `account-presenters.ts`: own pure protocol-to-view-model projection and account/character formatting used by more than one component.
- `account-presenters.test.ts`: verify pure refetch projection and user-visible formatting without adding a React test dependency.

Keep feature-only components local to this directory. Do not export a barrel file. Keep a helper in its component module if it has only one caller.

## Theme Integration

ReUI `Alert` and `Badge` use extended semantic tokens. After installation, inspect `src/index.css` and add only missing tokens to both `:root` and `.dark`, then register them in `@theme inline`:

- `--success` / `--success-foreground`
- `--info` / `--info-foreground`
- `--warning` / `--warning-foreground`
- `--invert` / `--invert-foreground`

Derive these from the existing muted teal, amber, cool slate, and foreground palette. Keep chroma restrained and verify WCAG AA contrast against the dark Frame surfaces. Do not introduce page-specific raw color utilities.

Do not change the existing global radius, typography, background, primary, or destructive tokens unless visual verification identifies a page-independent design-system defect.

## Responsive Behavior

- Mobile first: one column, full-width controls, and no fixed-height panels.
- Keep the stepper horizontal only if its two concise labels fit at 320 px; otherwise use its documented vertical orientation below `sm`.
- Let import rows wrap account metadata above actions. Confirmation inputs and submit buttons become full width on narrow screens.
- Wrap the data grid in its ReUI scroll area. The scroll container owns horizontal overflow; ancestors use `min-w-0`.
- Keep a compound account column so the most important identity remains visible before horizontal scrolling.
- Expanded account details collapse from two columns to one below `lg`.
- Invitation and shared-account actions wrap below identity content below `sm`.
- Interactive targets must remain at least 40 px high on touch layouts, even when desktop density is tighter.
- Test at 320, 375, 768, 1024, and 1440 px. No heading, profile URL, character name, or Polish action label may overflow its container.

## Accessibility and Security

- Preserve one `h1`; each Frame panel receives a correctly nested `h2` and expanded subsections use `h3`.
- Every icon-only expand, retry, dismiss, or destructive control needs a contextual Polish `aria-label`.
- Decorative icons and all `IconStack` artwork use `aria-hidden="true"`.
- Every non-submit button explicitly uses `type="button"`.
- Keep fields associated with visible labels and existing Effect Form error IDs.
- Announce preview, search, refetch, and invitation loading/results through `role="status"` or `aria-live` without duplicating toast announcements.
- Preserve keyboard navigation and visible focus styles in Stepper, DataGrid expansion, and Autocomplete.
- Autocomplete content must be portalled or otherwise escape any overflow container according to the installed Base UI implementation.
- External profile links use `target="_blank"` with `rel="noopener noreferrer"`.
- Render API strings as React text. Do not add `dangerouslySetInnerHTML`.
- Confirm that reduced-motion users receive instant or crossfade-only state changes.

## Implementation Sequence

1. **Install and inspect ReUI.** Run the component commands, review generated files and dependencies, confirm namespace coexistence, read installed APIs, and run `reui_validate_usage` for every planned prop.
2. **Add theme tokens.** Add only missing ReUI semantic tokens to `src/index.css`; verify dark-surface contrast before page work.
3. **Extract pure presentation logic.** Move the refetch projection and shared formatting into `account-presenters.ts`; add focused Vitest coverage while behavior is unchanged.
4. **Build the import tracer bullet.** Replace only the import panel with Frame + controlled Stepper, wire the existing Effect form and atoms, and verify preview/confirm/reset end to end.
5. **Build the owned account grid.** Start with read-only rows and loading/empty/failure states, then add expansion, refetch, and sharing in that order.
6. **Replace user search.** Integrate the installed Autocomplete API with the existing debounced atom and preserve send/revoke behavior.
7. **Build the access frame.** Move invitations and shared accounts into stacked panels with isolated async states.
8. **Remove obsolete page markup.** Delete replaced Card-like wrappers, manual preview/account lists, unused Collapsible imports, and redundant skeleton components only after parity is verified.
9. **Responsive and accessibility pass.** Test keyboard order, announcements, focus behavior, overflow, touch sizing, and reduced motion at the target viewport widths.
10. **ReUI audit and repository checks.** Run the ReUI audit checklist, formatter/linter, focused tests, typecheck, and production build.

Each implementation step should leave the page runnable. Do not perform the whole redesign as one unverified rewrite.

## Verification Matrix

### Automated

Run from the repository root:

```bash
pnpm exec vitest run apps/web/src/pages/dashboard/squad-builder/accounts/account-presenters.test.ts
pnpm --filter web check-types
pnpm check
pnpm --filter web build
```

Before finishing, call the ReUI audit checklist for at least `data-grid`, `stepper`, and `autocomplete`, and re-run `reui_validate_usage` against the final props and installed item names.

### Manual

- Empty owned accounts, no invitations, and no shared accounts.
- Loading and failure state for each independent atom, including retry.
- One valid import, multiple valid imports, mixed success/error lines, all invalid lines, and more than `MAX_PROFILE_URLS`.
- Confirm one result, confirm all successful results, clear results, and navigate away with a dirty form.
- Refetch with no changes, only additions, removals affecting squads, changed fields, apply failure, and apply success.
- User search below two characters, loading, no matches, matches, send success, and send failure.
- Grants loading, empty, accepted, pending, revoke success with and without removed squad characters, and revoke failure.
- Multiple invitations; responding to one must not disable unrelated invitations.
- Keyboard-only use of stepper, grid expansion, autocomplete, invite actions, links, and retries.
- Screen-reader announcements for async transitions without duplicate or stale messages.
- External profile links and long Polish/user-generated text at every target viewport.

## Acceptance Criteria

- All functional-baseline items work with the same API and atom contracts.
- Every major surface uses ReUI Frame; no top-level shadcn Card remains on this page.
- Owned accounts use ReUI DataGrid with stable IDs, skeleton loading, an instructional empty state, and expandable details.
- Import uses a controlled ReUI Stepper and never strands the user in an empty review stage.
- User invitation search uses ReUI Autocomplete with debouncing, loading, no-results, keyboard, and screen-reader behavior.
- Status UI uses ReUI Alert/Badge semantic variants and theme tokens, not raw colors.
- Existing shadcn primitives remain installed and usable alongside `src/components/reui`.
- The route file is a readable composition root and feature code is split by workflow without barrel exports.
- No content overflow or unusable horizontal layout occurs at 320 px.
- External links, async announcements, focus order, labels, and reduced motion meet the accessibility/security requirements above.
- Focused tests, web typecheck, Ultracite check, production build, ReUI usage validation, and ReUI audits pass.

## Explicit Non-Goals

- Changing backend APIs, Effect atoms, account permissions, or form validation rules.
- Redesigning other squad-builder pages in the same change.
- Replacing every shadcn primitive with a ReUI equivalent when ReUI has no equivalent.
- Installing premium ReUI blocks or Motion Icons.
- Adding pagination, filtering, virtualization, or drag-and-drop to the account grid without an observed data-volume requirement.
- Introducing a light theme, new font family, custom illustration system, or page-specific color palette.

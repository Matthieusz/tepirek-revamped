# Squad Builder UI Refinements Plan

## Status

- Planning only. Do not change runtime code as part of this document.
- Scope: `/dashboard/squad-builder/squads`, `/dashboard/squad-builder/accounts`, and account details expanded inside the accounts grid.
- Inputs: the four annotated screenshots supplied on 2026-07-14.
- Existing plans remain the behavioral baseline:
  - `squads-redesign-plan.md`
  - `accounts-redesign-plan.md`
- UI base: ReUI on shadcn Base UI (`base-nova`). Reuse the installed `Frame`, `Stepper`, `DataGrid`, `Autocomplete`, `Badge`, and `Alert` components; do not hand-roll replacements or edit generated ReUI internals.

## Goal

Refine alignment, information density, character identity, and account management without changing the established dark guild-ledger direction. The result should remove accidental empty space, make character-heavy data easier to scan, and expose account actions where users already manage an account.

## Annotated Feedback Summary

| Surface             | Feedback                                           | Decision                                                                                |
| ------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| New squad group     | Creation controls are misaligned                   | Align actions with the input row, not with the helper text                              |
| Squad group library | Tabs leave a large unused region                   | Move the tab list outside the collection `Frame`; keep it horizontal and compact        |
| Squad group rows    | `0 postaci` adds noise                             | Omit the character count when it is zero                                                |
| Owned accounts      | Show character images for each account             | Add a compact character-avatar stack to the account identity column                     |
| Import preview      | Professions need distinct color and icon           | Introduce shared typed profession presentation metadata and reuse auction icon language |
| Import preview      | Character summary should be vertical with chevrons | Replace comma-separated text with compact stacked character rows                        |
| Expanded account    | Add edit name and remove account                   | Add inline rename and a guarded destructive deletion flow beside refresh                |

## Visual Rules

- Preserve the existing dark-only theme, Inter UI text, JetBrains Mono for IDs, levels, counts, and timestamps, and Source Serif only for route-level headings.
- Keep color functional. Profession colors identify profession; teal remains reserved for primary action, active selection, and focus.
- Use existing semantic tokens and ReUI variants. Do not add raw page-level green, amber, red, or blue utilities.
- Preserve flat tonal layering. Do not add shadows, gradients, glass, side accents, or nested cards.
- Use Lucide outline icons. Reuse the auction profession icon choices where the profession maps cleanly.
- Keep transitions between 150 and 200 ms and limited to state changes. All content remains available with reduced motion.

## 1. Squad Creation Alignment

Target: `squads/create-squad-group-frame.tsx`

The current desktop form aligns its action group to the bottom of a field block that includes label, input, and helper text. This makes the primary and close controls sit against the helper line instead of the input.

Plan:

- Keep the current ReUI `Frame` and inline creation behavior.
- On `sm` and wider, compose the form as explicit label, control, and helper rows:
  - label above the input;
  - input and action cluster on the same row;
  - helper text below the input, with no action beside it.
- Keep `Utwórz grupę` and close controls at the input's height and vertically centered with it.
- Keep the input flexible and the actions intrinsic-width; prevent the action cluster from shrinking.
- Below `sm`, retain the current full-width stacked layout and keep the primary action labelled.
- Preserve autofocus, `Escape` behavior, validation, form protection, pending state, and navigation.

Acceptance:

- Input, primary button, and close button share one visual baseline at desktop widths.
- Helper copy does not influence action alignment.
- No horizontal overflow occurs at 320 px with the full Polish button label.

## 2. Squad Library Navigation and Density

Target: `squads/squad-group-library.tsx`

### Tab Placement

Move `TabsList` outside the bordered ReUI collection `Frame`. The active tab panel remains inside one `Frame`, while the compact horizontal tab list sits immediately above it as collection navigation.

Reasons:

- It removes the large visually empty region seen in the annotated layout.
- It keeps all available width for group rows.
- Horizontal tabs remain more usable than a permanent vertical rail on tablet and mobile.
- The same navigation model works at all breakpoints.

Rules:

- Use shadcn/Base UI `Tabs` with the existing keyboard behavior and counts.
- Keep the tab list content-width on desktop and horizontally scrollable only within its own labelled container on narrow screens.
- Use `variant="line"` or the nearest existing quiet tab treatment so the control reads as navigation rather than a nested card.
- The active panel `Frame` starts directly below the tab list with a small gap.
- Public filters remain inside the public collection frame because they operate on that panel's data.
- Do not introduce vertical tabs unless later user testing shows that collection switching benefits from persistent side navigation.

### Group Row Metadata

- Keep squad count and last update time.
- Render character count only when `characterCount > 0`; do not show `0 postaci`.
- Keep non-zero character counts localized through `formatCharacterCount`.
- Retain the role badge, real row link, focus treatment, and trailing chevron.
- Keep wrapping for long names; do not trade the recovered width for truncation.

Acceptance:

- Group rows begin at the same left edge as the active collection frame.
- No permanent blank tab column remains.
- Zero-character groups read cleanly without losing squad count or update time.
- Tab focus order, arrow navigation, selected state, and panel association remain correct.

## 3. Owned Account Character Avatars

Targets:

- `packages/api/src/protocol/squad-builder/account-import/account-import-schema.ts`
- account-import list service and persistence projection
- `apps/web/src/lib/squad-builder/account-import-atoms.ts`
- `accounts/owned-accounts-grid.tsx`

The current owned-account summary contains only `characterCount`, so this refinement requires a small additive API change before the UI can render real character images.

### Contract

Add an ordered, bounded character preview to each owned account summary:

```ts
readonly characterPreviews: readonly {
  readonly characterId: number;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly profession: string;
}[];
```

- Return at most four previews per account, ordered consistently with the account's character listing.
- Keep `characterCount` as the total count; previews are presentation data, not the source of the total.
- Do not add a per-account client request, which would create an N+1 loading pattern.

### Grid Composition

- Add a leading avatar stack within the compound `Konto` cell, before display name and profile ID.
- Show up to four small overlapping character avatars with proper alt text.
- Use initials or a profession icon fallback when `avatarUrl` is absent.
- When total characters exceed the visible previews, show a final `+N` indicator with an accessible label.
- Keep the stack compact enough that row height remains close to the current density.
- At narrow widths, keep avatar stack and account identity together as the first meaningful column before horizontal scrolling.

Acceptance:

- Every account with characters has visible character identity without expanding the row.
- Broken or absent image URLs have a stable fallback.
- Screen readers receive character names and the undisplayed count without duplicate noisy announcements.
- Loading skeletons match the new compound cell shape.

## 4. Profession Presentation

Targets:

- a feature-local profession metadata module shared by account import and squad editor
- `accounts/account-import-frame.tsx`
- `squad-editor/available-character-pool.tsx`
- `squad-editor/squad-roster-workspace.tsx`
- optionally consolidate `accounts/account-presenters.ts`

Create one typed profession presentation map for the six known Jaruna professions. Reuse the auction icon vocabulary:

| Profession     | Icon direction          |
| -------------- | ----------------------- |
| Tancerz ostrzy | `Swords`                |
| Łowca          | `Crosshair` or `Target` |
| Mag            | `Wand2` or `Flame`      |
| Paladyn        | `Shield`                |
| Tropiciel      | `Footprints`            |
| Wojownik       | `Axe`                   |

The map provides localized label, icon component, and one restrained semantic color role. Unknown API values fall back to a neutral icon and the original value; they must not crash rendering.

Rules:

- Give each known profession a distinguishable icon and color, but keep saturation low against the dark frame.
- Apply color to the icon and profession label only, not to the whole character row.
- Verify text/icon contrast against `FramePanel` and muted surfaces.
- Do not duplicate profession label maps across accounts and squad editor.
- Do not import page-specific auction components into squad builder; share or extract only the domain metadata that is genuinely common.

Acceptance:

- All six professions are distinguishable without relying on color alone.
- Account import and both squad-editor character lists use the same labels and visual meaning.
- Unknown professions remain readable and neutral.

## 5. Import Preview Character List

Target: `accounts/account-import-frame.tsx`

Replace the comma-separated mono sentence under each successfully previewed account with a compact vertical character list.

Each character row contains:

- a small right-facing chevron as a scan cue, marked decorative;
- profession icon in its profession color;
- character name as primary text;
- level in mono;
- localized profession label as secondary text.

Layout:

- Use a semantic nested `ul` below account identity.
- Keep rows dense with consistent 28 to 32 px rhythm; do not turn each character into a card or large badge.
- Align the confirmation form with the account identity column rather than adding arbitrary left padding tied to the old check icon.
- Let long character names wrap at 320 px while keeping level and profession understandable.
- If an account has no Jaruna characters, show one concise muted line rather than an empty list.

Acceptance:

- Each character occupies one scannable row.
- Profession, name, and level can be identified without parsing comma-separated text.
- The review step remains compact for accounts with many characters.

## 6. Expanded Account Actions

Targets:

- account-import protocol and HTTP API
- account-import service/store methods and tests
- `apps/web/src/lib/squad-builder/account-import-atoms.ts`
- `accounts/owned-accounts-grid.tsx`

The current API supports import, list, and refetch, but not account rename or deletion. Add those mutations explicitly rather than faking local-only changes.

### Action Placement

In the expanded row's left-side account section, place one compact action toolbar below profile metadata:

- `Odśwież` with `RotateCw`;
- `Edytuj nazwę` with `Pencil`;
- `Usuń konto` with `Trash2` and destructive styling.

Keep account sharing in the existing right-side section. Actions remain account-scoped; pending work on one account must not disable other grid rows.

### Rename

- Use progressive inline editing in the expanded row, not a modal.
- Replace the display name with the existing validated text field plus `Zapisz` and `Anuluj` actions.
- Reuse `AccountDisplayNameSchema` on both client and server boundaries.
- Preserve the current name on failure and show an actionable error near the field plus concise toast feedback where useful.
- Refresh `ownedAccountsAtom` after success and update all account-name projections through normal atom refreshes.

### Delete

- Use the standard shadcn/Base UI confirmation dialog because this is irreversible and may remove linked data.
- The dialog names the account and states the verified backend impact, including characters removed from saved squads and account-sharing grants if those are cascade effects.
- Require an explicit destructive `Usuń konto` confirmation; cancellation is the initial focus-safe path.
- The server must authorize ownership and perform deletion transactionally.
- Return structured impact counts so success feedback can report what was removed.
- On success, refresh owned accounts, available squad characters, affected squad groups, grants, and shared-account resources through the existing atom invalidation pattern.
- On failure, keep the expanded row and all previous data intact.

Acceptance:

- Rename and delete are available exactly where refresh and sharing are managed.
- Rename is keyboard-operable and does not open a dialog.
- Delete cannot occur without explicit confirmation and communicates its data impact.
- Mutations are owner-authorized, transactional, target-specific, and covered by service/store tests.

## 7. Responsive and Accessibility Pass

Test at 320, 375, 768, 1024, and 1440 px.

- Creation actions stack below the input only when the inline row no longer fits.
- Tabs may scroll inside their own container; the page and collection frame never scroll horizontally because of tabs.
- The DataGrid remains horizontally scrollable inside `DataGridContainer`, with account identity and avatar previews encountered first.
- Expanded account toolbar wraps as a unit without clipping labels.
- Import character rows wrap names without separating icons from their related label.
- Interactive targets remain at least 40 px on touch layouts.
- Every icon-only fallback, image stack, rename action, delete action, and dialog control has a contextual Polish accessible name.
- Decorative chevrons are hidden from assistive technology.
- Async rename/delete status is announced politely; do not duplicate the same message in both live regions and toasts.
- Keyboard verification covers tabs, row expansion, inline rename, delete confirmation, stepper, import confirmation, and sharing autocomplete.

## Implementation Sequence

1. **Add shared profession metadata.** Consolidate labels and icons, define restrained color roles, add unit coverage for known and unknown values, then apply it to existing squad-editor rows.
2. **Refine account import.** Replace the comma-separated character summary with vertical rows and align the confirmation form to the new structure.
3. **Fix squad creation alignment.** Change only form layout classes/composition and verify mobile wrapping.
4. **Move squad tabs outside the collection frame.** Preserve Base UI tab semantics, then omit zero character counts from rows.
5. **Extend owned-account summaries.** Add bounded character previews to the API projection and tests, then render the avatar stack in the compound account cell.
6. **Add rename account end to end.** Implement domain/service/store/protocol/atom support before wiring inline editing.
7. **Add delete account end to end.** Define transactional cascade behavior and impact result, add tests, then wire the confirmation flow.
8. **Run responsive and accessibility verification.** Check long names, missing avatars, all professions, keyboard paths, focus, announcements, and target viewports.
9. **Run repository and ReUI checks.** Validate installed component usage and complete focused tests, typecheck, Ultracite, and production build.

Each step should leave squad builder runnable. Keep protocol additions backward-compatible within the monorepo by updating server and web consumers together; do not combine all refinements into one unverified rewrite.

## Verification

### Automated

Run from the repository root:

```bash
pnpm exec vitest run apps/web/src/pages/dashboard/squad-builder/accounts/account-presenters.test.ts apps/web/src/pages/dashboard/squad-builder/squads/squad-group-presenters.test.ts apps/web/src/pages/dashboard/squad-builder/squad-editor/squad-group-draft.test.ts apps/web/src/lib/squad-builder/account-import-atoms.test.ts
pnpm --filter web check-types
pnpm check
pnpm --filter web build
```

Add focused API tests for:

- bounded and stable account character previews;
- rename validation and owner authorization;
- delete owner authorization, transaction rollback, cascade effects, and returned impact counts.

### Manual

- Creation frame with empty, long, pending, failed, and successful names at every target width.
- Owned/shared/public squad tabs with zero and non-zero counts, keyboard navigation, loading, failure, and empty states.
- Account rows with zero, one, four, and more than four characters; missing and broken avatar URLs.
- Import previews covering all six professions, unknown profession, long character names, and no Jaruna characters.
- Inline rename success, validation failure, request failure, cancel, and keyboard-only use.
- Delete cancel, success, authorization failure, persistence failure, and accounts whose characters appear in saved squads.
- Expanded rows and sharing autocomplete before, during, and after account mutations.

## Done Criteria

- The creation action cluster aligns with the input rather than helper text.
- Squad collection tabs no longer create a blank side region and remain keyboard-accessible.
- Group rows omit `0 postaci` while preserving useful metadata.
- Owned accounts show real character-avatar previews without N+1 requests.
- Character professions have consistent icon and color identities across account import and squad editor.
- Import previews use compact vertical character rows with chevrons.
- Expanded accounts support server-backed inline rename and guarded deletion beside refresh.
- Existing import, refetch, sharing, squad assignment, Effect atom, and ReUI behavior remains intact.
- No page-level overflow occurs at 320 px, and focused tests, typecheck, Ultracite, build, and manual accessibility checks pass.

## Non-Goals

- Replacing ReUI components or editing generated ReUI internals.
- Adding drag-and-drop, account sorting, bulk deletion, pagination, or account search.
- Showing every account character avatar when more than four previews would harm row density.
- Changing squad placement, invitation, visibility, or sharing authorization rules.
- Adding new fonts, light mode, premium ReUI blocks, Motion Icons, or page-specific palettes.

# Squad Group Character Picker and Filtering Redesign Plan

## Status and Scope

- Planning only. Do not install components or change runtime code as part of this document.
- Route: `/dashboard/squad-builder/squads/$groupId`.
- Primary target: `apps/web/src/pages/dashboard/squad-builder/squad-editor/available-character-pool.tsx`.
- Supporting targets:
  - `apps/web/src/pages/dashboard/squad-builder/squad-editor.tsx`
  - `apps/web/src/pages/dashboard/squad-builder/squad-editor/squad-group-draft.ts`
  - `apps/web/src/pages/dashboard/squad-builder/profession-presenters.ts`
- This route is keyed by squad-group `groupId`, despite often being described as the squad ID page.
- Keep the existing `base-nova` Base UI setup and ReUI `Frame` surface language.
- No API, Effect atom, authorization, placement constraint, save payload, or persistence change is required.

## Goal

Make finding and assigning a character fast when an account library is large. The picker should answer three questions without scanning a long list:

1. Which unassigned characters match the requested profession, level, character name, or account name?
2. Which squad can accept the selected character?
3. Why is a destination unavailable?

The result should remain a compact formation tool, not become a table, modal wizard, or drag-and-drop board.

## Current Problems

The current implementation has several concrete sources of friction:

- `AvailableCharacterPool` merges API results with `characterById`, so characters already assigned to a squad remain in the picker.
- One search input combines character name, profession, account display name, and account owner name. Users cannot express a precise level range or combine criteria predictably.
- The 22rem desktop sidebar renders one full-width row per character. Large account libraries create a long nested scroll even though character avatars are visually suited to a grid.
- Every row reserves a second line for `Przypisz do składu` and `Usuń ze składu` buttons.
- Account grouping is useful context, but repeated headings and tall rows amplify the list length.
- Assignment is visually separated from the character image, the most recognizable part of the item.

## Product Decisions

### Assigned Characters

- Hide assigned characters from the picker by default.
- Derive an `assignedCharacterIds` set from every `draft.squads[].characters[]` and exclude those IDs before applying user filters.
- Do not add a `show assigned` control in the first iteration. Assigned characters are already visible and removable in squad rosters.
- Removing a character from a roster makes it reappear immediately in the picker without a refetch.
- Assigning a character removes its tile immediately after the successful local draft transition.
- Continue merging API characters with saved roster metadata so a removed saved character can return to the picker even if it is absent from the latest available-character response.

### Filter Behavior

All criteria combine with logical AND. Multiple selected professions combine with logical OR.

| Filter         | Matching rule                                                | UI                                                                       |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Profession     | Exact normalized profession; any selected profession matches | Always-visible compact profession toggles plus a ReUI multiselect filter |
| Level from     | Inclusive integer lower bound                                | Labelled numeric input                                                   |
| Level to       | Inclusive integer upper bound                                | Labelled numeric input                                                   |
| Character name | Trimmed, case-insensitive substring using `pl-PL` locale     | ReUI text filter                                                         |
| Account name   | Trimmed, case-insensitive substring of `accountDisplayName`  | ReUI text filter                                                         |

Additional rules:

- Empty values are unbounded and do not filter.
- Levels must be positive safe integers. Do not invent a maximum that is absent from the domain model.
- `levelFrom > levelTo` shows an inline error associated with both inputs. While invalid, apply profession/name/account filters but ignore the level range until corrected.
- Filtering is immediate and local. The character collection is already client-side, so no apply button, debounce, URL state, dirty-form protection, or API request is needed.
- Show `N z M dostępnych`, where `M` is the unassigned count before user filters.
- `Wyczyść filtry` clears ReUI filters, profession quick toggles, and both level inputs.
- Preserve filters while assigning and removing characters during the current route mount. Reset them when `groupId` changes.

### Profession Quick Filters

- Render all six known professions as compact toggle buttons above the advanced filter chips.
- Reuse `getProfessionPresentation` for the existing icon, Polish label, and semantic color class:
  - Tancerz ostrzy: `Swords`, `text-chart-1`
  - Łowca: `Crosshair`, `text-info`
  - Mag: `Wand2`, `text-warning`
  - Paladyn: `Shield`, `text-success`
  - Tropiciel: `Footprints`, `text-chart-4`
  - Wojownik: `Axe`, `text-destructive`
- Use real buttons with `aria-pressed`; do not make a non-interactive Badge clickable.
- Give selected toggles a clear border/background/focus treatment while retaining the profession color on the icon. Selection must not depend on color alone.
- The quick toggles and ReUI profession multiselect update the same profession filter state. They must never drift into two independent filters.
- Keep unknown API profession values visible when no profession is selected. A known-profession selection excludes unknown values.

## ReUI Selection

Use ReUI for the structured filter language and existing page surfaces. Keep basic form controls and assignment menus in the installed shadcn primitives.

| Component      | Responsibility                                                                                              | Documentation                                | Preview                            |
| -------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------- |
| ReUI `filters` | Profession multiselect, character-name filter, account-name filter, active filter chips, Polish filter menu | https://reui.io/docs/components/base/filters | https://reui.io/components/filters |
| ReUI `frame`   | Character-pool surface and filter/results separation                                                        | https://reui.io/docs/components/base/frame   | https://reui.io/components/frame   |
| ReUI `badge`   | Result count only; not interactive profession controls                                                      | https://reui.io/docs/components/base/badge   | https://reui.io/components/badge   |

Composition references:

- `c-filters-1`: multiselect options with icons and a clear action: https://reui.io/preview/base/components/c-filters-1
- `c-filters-2`: validated text input composition: https://reui.io/preview/base/components/c-filters-2
- `c-filters-9`: localized labels/operators and compact sizing: https://reui.io/preview/base/components/c-filters-9

The ReUI MCP API and planned props were validated on 2026-07-14. `Filters` supports `filters`, `fields`, `onChange`, `size`, `allowMultiple`, `i18n`, and `className`.

### ReUI Filters Configuration

- Build filter instances with `createFilter`; never hand-construct IDs.
- Configure `profession` as `multiselect`, with options generated from the shared profession presentation data. Each option receives the existing profession icon and color class.
- Configure `characterName` and `accountName` as `text` fields using the `contains` operator.
- Set `allowMultiple={false}` so one field cannot appear repeatedly with contradictory values.
- Use `size="sm"` and Polish `i18n` labels/operators based on `c-filters-9`.
- Keep level controls outside `Filters` as two shadcn numeric Inputs in the same toolbar. The verified ReUI API has text/select/multiselect/custom fields, but no native numeric range. Do not invent undocumented range props or add a custom renderer solely to force these two fields into a chip.
- Use the active ReUI filter chips as the canonical advanced-filter display. Do not build a second custom chip system.

### Installation

`Frame` and `Badge` already exist. `Filters` is not currently installed. During implementation, run from `apps/web`:

```bash
pnpm dlx shadcn@latest add @reui/filters --yes
```

After installation, inspect generated files and lockfile changes, then repeat `reui_validate_usage` against the final props. Do not edit generated ReUI internals.

## Character Picker Redesign

### Layout

Replace the narrow row list with a wider character-tile grid inside the existing Frame:

```text
[ Dostępne postacie                         14 z 38 ]
[ profession quick toggles                           ]
[ + Dodaj filtr ] [active ReUI filter chips] [clear ]
[ Poziom od ] [ Poziom do ]
-----------------------------------------------------
[ account heading ]
[ character tile ] [ character tile ]
[ character tile ] [ character tile ]
```

- Increase the desktop workspace split from `22rem` to approximately `28rem`, subject to testing at 1280 and 1440 px.
- Use two tile columns in the desktop picker where each tile remains at least about 12rem wide.
- Use one column at 320px, two columns when tile content fits, and normal document flow below `xl`.
- Keep account sections, but make the account heading one compact line above its tile grid rather than repeating owner details in every tile.
- Account heading shows `accountDisplayName` and, only when useful for shared ownership, `accountOwnerUserName` as secondary text.
- Sort account sections by display name and characters within each account by level descending, then name. Filtering must not mutate source arrays.
- Keep scrolling owned by the picker panel only on desktop, using a real flex/min-height chain and shadcn ScrollArea. Do not introduce an arbitrary fixed pixel height.
- Do not add pagination or virtualization initially. Assigned exclusion, filtering, and two-column density should be measured first. Add virtualization only if realistic production data still causes rendering or interaction latency.

### Character Tile

Each tile contains:

- A prominent Margonem character image with the existing fallback.
- Character name as the primary label.
- Mono level value.
- Profession icon and localized profession label using the existing presentation metadata.
- No repeated account line because the enclosing account section supplies that context.

Use semantic lists: account groups are list items and each character grid is a nested list.

### Image Assignment Interaction

- Make the image area the `DropdownMenuTrigger` for squad selection.
- Hovering the image reveals a quiet overlay with `UserPlus` and `Dodaj do składu`.
- Hover must reveal the action, not execute it. Click/tap opens the destination menu to avoid accidental assignment.
- Keyboard focus reveals the same overlay. Enter or Space opens the same menu.
- On touch/coarse-pointer layouts, keep a compact add affordance permanently visible because hover does not exist.
- Give the trigger a contextual accessible name such as `Dodaj postać {name} do składu` and a visible focus ring around the image.
- Always open the destination menu, even when only one squad exists. Consistent destination confirmation is safer than a context-dependent direct action.
- Keep the menu available when no destination is eligible so users can read disabled reasons.
- Destination rows retain squad name, `current/10` capacity, and explicit disabled reasons for a full squad or an already represented account.
- Route every assignment through the existing `applyPlacement` transition. UI filtering and disabled states are not correctness boundaries.
- Do not retain `Usuń ze składu` in the picker because assigned characters are hidden. Removal remains on the squad roster row.

## Empty, Loading, and Error States

Distinguish these states instead of showing one generic empty message:

- API loading: tile-shaped skeletons matching the final grid.
- API failure: existing local destructive ReUI Alert and retry; saved rosters remain visible.
- No source characters: existing Jaruna account guidance and link to accounts.
- Every character assigned: `Wszystkie dostępne postacie są już przypisane do składów.`
- Filters have no matches: show active result count, `Brak postaci pasujących do filtrów`, and `Wyczyść filtry`.
- Invalid level range: keep non-level-filtered results visible and show the range error; do not mislabel this as zero matches.
- No squads: character tiles remain browsable. Their image menus open with `Najpierw dodaj skład` rather than disabling the trigger without explanation.

## State and Pure Filtering Model

Keep server state in the existing Effect atom and draft placement state in the editor. Keep filter input state local to `AvailableCharacterPool`.

Recommended derived pipeline:

```text
API characters + saved character metadata
  -> deduplicate by characterId
  -> remove assigned characterIds
  -> parse ReUI filters and valid level bounds
  -> apply combined predicate
  -> group by accountId
  -> sort groups and characters
  -> render tiles
```

Extract a small pure sibling module only because the filter translation and predicate need focused tests:

```text
squad-editor/
  available-character-pool.tsx
  character-pool-filters.ts
  character-pool-filters.test.ts
```

`character-pool-filters.ts` should own:

- The typed filter field keys.
- Parsing ReUI `Filter[]` plus raw level inputs into a domain filter value.
- Locale-aware normalized text matching.
- Inclusive level matching.
- Assigned-ID exclusion.
- Stable grouping/sorting helpers only if they remain non-trivial.

Do not move placement logic out of `squad-group-draft.ts`; both the overlay menu and roster continue using the existing tested transition.

## Accessibility and Responsive Requirements

- Profession toggles use `aria-pressed` and include text labels; icons are decorative.
- Every level input has a visible label, `inputMode="numeric"`, and shared error association when the range is invalid.
- ReUI filter menu/chips use the documented Base UI keyboard behavior and Polish labels.
- Image assignment is fully usable by pointer, keyboard, and touch. No action is hover-only.
- Dropdown content portals outside the picker scroll region and is not clipped.
- Do not hide character/account names with truncation as the only behavior; allow wrapping within tile bounds.
- Maintain at least 40px touch targets for image triggers and filter controls.
- Result changes and successful local assignment use one polite status region. Persistence outcomes continue using existing toasts.
- Respect reduced motion; the overlay may change opacity without movement and must appear immediately when reduced motion is requested.
- Verify at 320, 375, 768, 1024, 1280, and 1440 px with long Polish names.

## Implementation Sequence

1. Install ReUI `filters`, inspect the generated Base UI component, and copy only the relevant composition patterns from `c-filters-1`, `c-filters-2`, and `c-filters-9`.
2. Add pure filter parsing/matching tests for assigned exclusion, profession OR semantics, combined AND semantics, names, inclusive levels, invalid ranges, and locale-insensitive matching.
3. Replace the combined search query with typed ReUI filter state and explicit level state while keeping the current list markup.
4. Exclude assigned IDs and add distinct all-assigned, no-source, and no-filter-match states.
5. Add profession quick toggles backed by the same ReUI profession filter.
6. Convert account rows to responsive character-tile grids and adjust the desktop workspace width.
7. Move destination selection onto the image trigger, add hover/focus/touch overlay behavior, and remove the row-level assignment/removal buttons.
8. Verify disabled destination explanations and that every assignment still passes through `applyPlacement`.
9. Run ReUI usage validation and the Filters audit, then complete responsive, keyboard, screen-reader, and reduced-motion checks.

Each step should leave assignment usable. Do not combine filter-domain changes, tile conversion, and interaction replacement into one unverified rewrite.

## Verification

### Automated

Run from the repository root:

```bash
pnpm exec vitest run apps/web/src/pages/dashboard/squad-builder/squad-editor/character-pool-filters.test.ts apps/web/src/pages/dashboard/squad-builder/squad-editor/squad-group-draft.test.ts
pnpm --filter web check-types
pnpm check
pnpm --filter web build
```

### Manual Matrix

- No characters, only assigned characters, only unassigned characters, and mixed assigned/unassigned characters.
- One and multiple selected professions; clear through quick toggle, ReUI chip, and clear-all action.
- Character and account names with mixed case, Polish characters, spaces, and no matches.
- Minimum only, maximum only, inclusive boundaries, non-integer values, negative values, and reversed range.
- Combined profession + level + character + account criteria.
- Zero squads, one squad, multiple squads, full squad, and duplicate-account destination.
- Pointer hover/click, keyboard focus/Enter/Space/Escape, and touch without hover.
- Assignment removes a tile; roster removal restores it under the still-active filters.
- Filter state does not mark the group draft dirty; assignment still does.
- Long account, owner, character, profession, and squad names at every target viewport.
- Dropdown remains visible outside the scroll region and focus returns to a sensible element after the assigned tile disappears.

## Acceptance Criteria

- Assigned characters never appear in the picker and reappear immediately after roster removal.
- Users can combine profession, inclusive level range, character name, and account name filters locally.
- Profession controls reuse the established icons, colors, and localized labels.
- ReUI Filters provides structured advanced filters and active chips with Polish copy.
- Large pools render as a responsive account-grouped tile grid rather than a single long row list.
- Squad assignment starts from the character image and works equally by pointer, keyboard, and touch.
- Invalid destinations expose a textual reason and remain protected by `applyPlacement`.
- Filter changes never affect dirty draft state, APIs, or save payloads.
- Existing loading, retry, first-use, placement, and role behavior remains intact.
- Focused tests, web typecheck, Ultracite, build, ReUI validation, and ReUI audit pass.

## Non-Goals

- Server-side filtering, URL-persisted filters, pagination, or account search API changes.
- Showing assigned characters in the picker or moving characters directly between squads from the picker.
- Drag-and-drop assignment or squad/character reordering.
- Changing the one-character-per-account rule or 10-character squad capacity.
- Replacing ReUI Filters with custom chips or modifying generated ReUI internals.
- Adding premium ReUI blocks or Motion Icons.

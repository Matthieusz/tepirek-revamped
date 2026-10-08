# UI/CSS improvements implementation plan

## Goal

Improve accessibility, touch usability, responsive layouts, and visual consistency without modifying Base UI positioning.

This plan follows the recommendations reviewed from [good-css](https://good-css.com/index.md), adapted to the existing Tailwind and component conventions. It is a backlog, not a requirement to adopt every technique on that site.

## Scope and guardrails

- Do not change Base UI `Positioner` configuration, anchors, offsets, collision handling, placement, alignment, or popup positioning geometry.
- Preserve existing focus management, dismiss behavior, portals, and component-library interaction contracts.
- Do not replace Base UI or Vaul with native CSS implementations.
- Do not change dialog, drawer, sheet, or app-shell viewport sizing in these batches. Those improvements are outside this positioning-conservative scope.
- Do not perform a blanket reset, theme rewrite, dependency installation, or repository-wide utility migration.
- Reuse existing utilities and component conventions; introduce only the minimum shared styling needed.
- Keep independent changes in small, reviewable batches. Do not commit or push unless requested.
- Browser-verification tasks are hypotheses until reproduced. Skip changes where the existing behavior is already correct.

All source paths below are relative to `apps/web/src/`. Backlog IDs refer to the preceding review.

## Before implementation

1. Read repository and directory-specific instructions.
2. Use CodeGraph to locate each component and its callers, then read the complete current files. The initial review is not a substitute for checking current source.
3. Read the coding-standards skill before changing TypeScript. If writing Effect code becomes necessary, follow the repository's Effect guide requirements; these CSS batches should not need new Effect workflows.
4. Inspect installed Tailwind behavior or generated CSS where utility semantics matter, especially `scale`, outlines, animation variants, and arbitrary transition properties.
5. Identify representative screens and establish browser baselines for the batch.
6. Inspect existing tests and test commands before adding or running targeted tests. Prefer behavior assertions over snapshots of class strings.

## Batch 1 — high-impact shared controls

### 1. Touch-friendly targets (#8–10)

**Files:** `components/ui/button-variants.ts`, `components/ui/button.tsx`, `components/ui/sidebar.tsx`, `components/ui/input.tsx`, `components/ui/select.tsx`; inspect dialog/sheet close-button callers without changing popup positioning.

- Provide approximately 44px hit targets for small icon buttons where practical.
- Prefer larger actual controls under coarse-pointer conditions when expanded hit areas would overlap neighboring controls.
- Use a pseudo-element only where it is not already occupied, clipped by ancestors, or overlapping another target.
- Keep desktop density unless a larger target is appropriate for all inputs.
- Review sidebar links, submenu links, toggles, and text controls separately; generic button changes do not cover them all.
- Do not change select positioners or popup placement. Larger triggers may change rendered anchor dimensions naturally; verify the library still places the popup correctly without overriding its geometry.

**Acceptance:** targets are easy to activate on touch; neighboring actions remain distinct; icons and text retain their intended alignment; desktop tables and toolbars do not unexpectedly grow.

### 2. Opt-in spatial motion (#13)

**Files:** `components/ui/button-variants.ts`, `components/ui/dialog.tsx`, `components/ui/alert-dialog.tsx`, `components/ui/sheet.tsx`, `components/ui/sidebar.tsx`, `components/ui/tooltip.tsx`.

- Gate spatial animations/transitions with `prefers-reduced-motion: no-preference` or equivalent `motion-safe:` utilities.
- Preserve final open/closed states, positioning transforms, and library animation lifecycle contracts.
- Separate animation transforms from transforms needed for centering or placement. Never globally remove transforms.
- Retain appropriate color/opacity feedback.
- Avoid a global near-zero-duration override.

**Acceptance:** reduced-motion mode avoids animated movement and scaling; panels still open, close, and unmount correctly; normal-mode positioning and interaction remain unchanged.

### 3. Command-search input accessibility (#20)

**File:** `components/dashboard-command-menu.tsx`.

- Use a mobile font size consistent with the shared input's 16px default.
- Add a visible focus treatment that fits the command-menu design.
- Preserve combobox semantics, active-descendant behavior, and keyboard navigation.

**Acceptance:** focusing search on iOS does not trigger font-size-related zoom; focus is visible; typing, arrow navigation, Enter, and Escape continue to work.

### 4. Bound textarea growth (#27)

**Files:** `components/ui/textarea.tsx` and inspected form-field callers.

- Keep `field-sizing: content` and the existing minimum size.
- Add an appropriate maximum block size and vertical scrolling beyond it.
- Preserve manual resizing where currently supported.
- Check callers with explicit height constraints before choosing a shared default.

**Acceptance:** pasted long text does not grow the field indefinitely; all content remains editable and scrollable; unsupported browsers retain a usable textarea.

### 5. Readable alert headings (#28)

**File:** `components/reui/alert.tsx` and its callers.

- Remove default single-line clamping for important warning/error headings.
- Add localized wrapping/shrinkability where needed.
- Check icon and action alignment with multiline headings.

**Acceptance:** essential alert headings remain readable at narrow widths and zoom without covering actions.

### Batch 1 implementation status

Implemented the five batch 1 styling tasks. Automated verification passed: `pnpm check`, web type-check, web build, and targeted sidebar, responsive-dialog, command-menu, and form-field tests (10 tests). The select and dialog positioner configuration was not changed.

Browser acceptance remains deferred: touch-target separation and alignment, reduced-motion panel lifecycle, iOS input zoom/focus visibility, textarea resizing/overflow, and multiline alert/action alignment have not been verified in browsers.

## Batch 2 — interaction and focus hardening

| Task | Implementation | Acceptance |
| --- | --- | --- |
| Hover-only actions (#11) | Inspect `SidebarMenuAction` usages. Make action visibility depend on input capability rather than viewport width alone; preserve keyboard focus visibility. | Actions remain discoverable on touch-capable large screens and usable by keyboard. |
| Press feedback (#12) | Inspect custom pressable controls and reuse appropriate active color/opacity feedback; gate animated scale where needed. | Feedback occurs immediately on press without depending on hover or causing layout shifts. |
| Correct scale transition (#14) | In `button-variants.ts`, include the actual `scale` property used by the active utility after checking generated CSS. | Press/release animates smoothly in normal mode and remains usable in reduced-motion mode. |
| Explicit transitions (#15) | Replace `transition-all` in `TabsTrigger` and `SidebarRail` with only the properties that intentionally change. | Existing intended effects remain; unrelated sizing/style changes do not animate accidentally. |
| Small motion vocabulary (#16) | Reuse a small set of duration/easing choices in touched components. Add tokens only if they materially remove duplication. | Similar interactions feel consistent without introducing a new animation abstraction. |
| Forced-colors focus (#17) | Inspect generated outlines and test buttons, inputs, custom command options, and tab panels. Add outline fallbacks only where a problem is demonstrated. | Keyboard focus remains visible in light, dark, and forced-colors modes; rings are not clipped. |

Do not change tooltip/select positioning or add movement effects to otherwise static controls.

### Batch 2 implementation status

Implemented the input-capability-based `SidebarMenuAction` visibility fallback (no current usages found), immediate pressed-state feedback for the custom event icon/color controls, the `scale` transition property for shared button press animation, explicit transition properties for tabs and the sidebar rail, and consistent duration/easing on touched effects. Generated Tailwind CSS confirms the shared button transition includes the standalone `scale` property and emits the `pointer-fine` media query.

Automated verification passed: `pnpm check`, web type-check, all web tests, and web build. No Base UI positioning or focus-management configuration was changed. Forced-colors focus verification remains deferred: inspect buttons, inputs, custom command options, and tab panels in an actual forced-colors browser before adding any outline fallback. Keyboard focus visibility and touch/keyboard press feedback also remain for browser verification.

## Batch 3 — responsive content layouts

### 1. Intrinsic price-card grid (#21)

**File:** `routes/dashboard/-components/cennik-page.tsx`.

- Replace viewport-dependent item column counts with a content-width-driven grid.
- Start by testing `repeat(auto-fill, minmax(min(100%, 16rem), 1fr))`; treat 16rem as a trial value, not a fixed requirement.
- Tune the minimum against names, profession labels, price inputs, and save controls.
- Prefer stable card widths for filtered lists; compare `auto-fill` and `auto-fit` against actual empty/short results.

**Acceptance:** cards remain usable with the sidebar open/closed and at intermediate widths; one-card results do not become unintentionally oversized; there is no page-level horizontal overflow.

### 2. Container-responsive squad workspace (#22)

**File:** `routes/dashboard/squad-builder/-components/squad-editor/squad-editor-layout.tsx`.

- Measure the minimum useful widths of the roster and character pool.
- Use a container query or content-driven wrapping to select the split layout from workspace width, not viewport width alone.
- Avoid creating a container on a shrink-to-fit element.
- Preserve existing DOM order and verify visual reordering does not make keyboard navigation confusing.

**Acceptance:** both panels remain usable as sidebar width changes; the split only activates when there is enough room; narrow-screen ordering and keyboard behavior remain coherent.

### 3. Long tab-row overflow (#23)

**Files:** `components/ui/tabs.tsx` and inspected callers.

- Choose an explicit horizontal scrolling strategy for rows that cannot fit.
- Ensure the start of the row stays reachable; avoid unsafe centering of overflowing content.
- Keep focused/active tabs reachable and focus indicators visible.
- Do not add an anchor-positioned indicator or alter Base UI positioning.

**Acceptance:** longer labels and narrow widths do not widen the page; touch, keyboard, and trackpad access work; vertical tab layouts are unaffected.

### 4. Narrow-screen page gutters (#26)

**File:** `routes/dashboard/-components/dashboard-layout.tsx`.

- Test reduced mobile padding or a small fluid spacing value against current `px-6 py-6`.
- Preserve existing desktop spacing unless evidence supports a change.

**Acceptance:** mobile content gains useful space without touching screen edges or changing popup positioning.

### Batch 3 implementation status

Implemented all four batch 3 layout tasks: price cards now use an intrinsic auto-fill grid; the squad editor switches to a 28rem-pool split at a 64rem workspace container width and preserves DOM/visual order when stacked; the squad-group tabs have a scrollable, non-shrinking horizontal row; and dashboard gutters reduce to 1rem on narrow screens while retaining 1.5rem from `sm` upward. The build output confirms Tailwind emits the intrinsic grid and named container-query utilities.

Automated verification passed: `pnpm check`, web type-check, all web tests (297 tests), and web build. No Base UI positioning configuration was changed. Browser acceptance remains deferred: confirm price-card widths and overflow with short/filtered lists; test the split around the 64rem workspace threshold with sidebar states and keyboard navigation; verify tab touch/keyboard/trackpad scrolling and focus visibility; and check mobile gutters at narrow widths and zoom.

## Batch 4 — readable data and resilient content

| Task | Files / approach | Acceptance |
| --- | --- | --- |
| Table wrapping (#29) | `components/ui/table.tsx` and inspected table callers. Allow descriptive columns to wrap selectively; preserve compact numeric/date/identifier columns. | Long descriptions remain readable without turning every column into multiple lines; wide tables still scroll intentionally. |
| Tabular numbers (#30) | Start with prices, price inputs, and result counts in `cennik-page.tsx`; inspect calculator/table renderers before extending. Apply `tabular-nums` narrowly. | Digits have consistent widths; prose retains proportional figures; number formatting is unchanged. |
| Long-content hardening (#31) | Reproduce overflow with long names, URLs, error messages, and breadcrumbs. Add `min-w-0`/wrapping to the specific failing parent chain. | No accidental page overflow; essential text is readable; fixed-size icons and images are not squeezed. |

Do not apply a global `min-height: 0`, nowrap removal, or truncation policy. Truncate only when the full text is reliably available elsewhere.

### Batch 4 implementation status

Implemented selective wrapping for event-name table cells while retaining nowrap defaults for compact columns and the existing horizontal table viewport. Applied `tabular-nums` to rendered catalog prices, catalog counts, and calculator results without changing number formatting. Hardened the identified long-content paths: breadcrumb flex items and labels can shrink/wrap, dashboard breadcrumb space can shrink, recoverable query errors wrap, and the catalog refresh error can wrap without squeezing its retry action.

Automated verification passed: `pnpm check`, web type-check, all web tests, and web build. No table-wide nowrap policy, popup positioning, or number formatting was changed. Browser acceptance remains deferred: verify descriptive wrapping alongside compact columns and horizontal scrolling; compare numeric alignment on price/catalog/calculator screens; and test long names, unbroken URLs, error text, breadcrumbs, narrow widths, zoom, and Firefox/Safari behavior.

## Batch 5 — theme consistency and optional polish

### Theme and contrast

- **Toast theme (#32):** inspect `components/ui/sonner.tsx`, installed Sonner APIs, and application theme handling. Remove the unconditional dark-theme mismatch while retaining semantic CSS tokens. Test rich-color, loading, action, and dismiss states in both themes.
- **Contrast (#33):** measure foreground/background pairs for muted text, destructive controls, focus indicators, and interaction states. Disabled-state readability should also be reviewed, while distinguishing it from applicable contrast requirements. Change only demonstrated failures; recheck light and dark themes.

### Optional, evidence-driven polish

- **Nested radii (#35):** adjust only visibly inconsistent nested surfaces; relate outer and inner radii to the actual intervening spacing.
- **Decorative clipping (#36):** consider `overflow-clip` only on non-scrolling shells. Preserve programmatic scrolling, resizing, sticky behavior, and focus visibility. Do not change an element merely because it contains `overflow-hidden`.
- **Horizontal overflow cues (#37):** add shadows or progressive CSS fades only where hidden content is hard to discover. Keep essential content, focus indicators, and pinned columns clear. Unsupported browsers must retain ordinary scrolling without a required JavaScript fallback.

These are not prerequisites for completing the earlier accessibility batches.

### Batch 5 implementation status

The Sonner toaster now follows the resolved application theme instead of forcing dark mode; caller-provided Sonner props still override defaults. Contrast measurements (sRGB relative luminance from the authored OKLCH tokens) found the dark destructive text/action palette was insufficiently distinct when one color served both text and solid fills. Dark destructive text now has a brighter token, while solid destructive controls use a dedicated darker action token. Measured text contrast is at least 4.85:1 for the checked muted, destructive, and focus pairs; solid destructive action text is at least 4.97:1 in light mode and 6.14:1 in dark mode. Disabled controls were reviewed separately; their reduced contrast is intentional and exempt from WCAG contrast requirements.

No radii, clipping, or overflow-cue changes were made: the plan calls for evidence-driven polish, and no specific failing surface was established. Browser verification remains deferred for Sonner rich-color/loading/action/dismiss states in both application themes, interaction-state contrast, and any candidate nested surfaces or scroll affordances. Forced-colors and browser-specific verification also remain outstanding.

## Batch 6 — component correctness

These fixes do not modify Base UI positioning, but should be tested separately from styling changes.

### Forward tab orientation (#18)

**File:** `components/ui/tabs.tsx`.

- Forward `orientation` to `TabsPrimitive.Root` as well as using it for styling.
- Add or extend behavior tests for horizontal and vertical arrow-key navigation.

**Acceptance:** keyboard behavior matches the rendered orientation without regressing controlled/uncontrolled tab selection.

### Preserve mobile responsive-trigger composition (#19)

**File:** `components/ui/responsive-dialog.tsx`.

- Inspect installed Vaul trigger APIs before implementation.
- Honor `asChild` on the mobile branch and forward supported trigger props consistently.
- Avoid nested buttons when a supplied trigger is already a button.
- Extend `responsive-dialog.test.tsx` with mobile and desktop composition/prop-forwarding coverage.

**Acceptance:** each branch renders a valid single interactive trigger; supplied event handlers, labels, and disabled state behave correctly; opening/closing and focus restoration still work.

### Batch 6 implementation status

Forwarded tab orientation to `TabsPrimitive.Root`, so Base UI receives the same orientation used by the styling; tests cover horizontal and vertical orientation propagation. The mobile responsive-dialog trigger now forwards `asChild` and the supported trigger props to Vaul, preventing nested buttons and preserving labels, click handlers, and disabled state. Targeted tests pass for both desktop and mobile trigger composition and prop behavior. Automated browser-level arrow-key navigation, trigger open/close behavior, and focus restoration remain deferred.

## Validation for every batch

### Automated

- Run relevant existing tests and new targeted tests using inspected repository commands.
- Run `pnpm check` for formatting and linting.
- Use `pnpm fix` when needed, inspect its diff, and rerun checks.
- Run applicable type checks using the repository's existing commands.
- Review the diff explicitly for any positioning, anchor, offset, alignment, collision-handling, or unrelated changes.

### Browser matrix

- Light and dark themes.
- Normal and reduced-motion preferences.
- Forced-colors mode where available.
- Keyboard, mouse/trackpad, and touch input.
- 320–360px widths, intermediate desktop widths, and short landscape screens.
- Sidebar expanded and collapsed.
- 200% and 400% zoom with intentional table scrolling distinguished from accidental page overflow.
- Long Polish labels, names, unbroken URLs, errors, and large pasted textarea content.
- Firefox and Safari fallbacks for newer CSS features.
- Real mobile keyboard behavior for form and command-search changes.

Use representative price-catalog, announcement-form, squad-editor, command-menu, tab, and table screens. Inspect their current callers before choosing fixtures.

## Completion criteria

- Every implemented task has its acceptance criteria checked and recorded.
- Unreproduced verification candidates are marked as already satisfactory or deferred rather than changed speculatively.
- No Base UI positioning configuration or popup geometry overrides have changed.
- Existing component interaction contracts and relevant tests remain intact.
- Formatting, linting, applicable type checks, and targeted tests pass, or blockers are explicitly reported.
- Remaining optional polish and out-of-scope panel/app-shell sizing work are listed separately.

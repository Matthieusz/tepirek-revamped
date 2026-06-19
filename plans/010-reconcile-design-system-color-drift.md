# Plan 010: Reconcile the design-system color direction with implementation

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat de43490..HEAD -- DESIGN.md PRODUCT.md apps/web/src/index.css`
> If any in-scope file changed since this plan was written, compare the excerpts below against live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-establish-workspace-typecheck.md`
- **Category**: direction
- **Planned at**: commit `de43490`, 2026-06-19

## Why this matters

The design documentation says the interface should use warm-tinted dark neutrals and explicitly avoid cold blue-gray. The implemented tokens now use many hue-270 cool slate neutrals, and recent git history includes an intentional “cool slate” design shift. Drift between docs and implementation causes future UI work to oscillate: agents and humans will follow different sources of truth.

## Current state

Relevant files:

- `DESIGN.md` — design-system specification.
- `PRODUCT.md` — product/brand direction.
- `apps/web/src/index.css` — actual Tailwind/theme color tokens.

Design doc excerpts:

```md
// DESIGN.md:20-26

- Dark surfaces with warm-tinted neutrals — never cold blue-gray, never pure black.
- Monospace for data and UI chrome; display type for major headings.
- Flat by default; motion is responsive feedback, not choreography.
```

```md
// DESIGN.md:44-52
Warm-tinted dark grays for surfaces and backgrounds...
**The Dark-Only Rule.** There is no light mode.
```

Implementation excerpts:

```css
/* apps/web/src/index.css:10-27 */
--background: oklch(0.13 0.008 55);
--foreground: oklch(0.92 0.012 55);
--card: oklch(0.18 0.008 270);
--card-foreground: oklch(0.92 0.008 270);
--popover: oklch(0.18 0.008 270);
--secondary: oklch(0.24 0.01 270);
--muted: oklch(0.2 0.008 270);
--border: oklch(0.28 0.008 270);
```

Product intent:

```md
// PRODUCT.md:15-17
Modern, minimalistic, game-vibe... clean lines, purposeful density, and subtle nods to RPG interface language... Polish copy should feel natural.
```

Observed git signal:

- Recent commit messages include `feat(design): shift card and sidebar tones from warm earthy to cool slate`, suggesting the implementation drift may be intentional and the docs may be stale.

Repo conventions:

- Keep the design system dark-mode only.
- Avoid generic SaaS patterns and preserve restrained game-vibe.
- Do not introduce a light mode.

## Commands you will need

| Purpose              | Command            | Expected on success                                                                  |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| Lint/format docs/CSS | `pnpm check`       | exit 0                                                                               |
| Typecheck            | `pnpm check-types` | exit 0 if source CSS/token changes are made; otherwise still run as regression check |

## Scope

**In scope**:

- `DESIGN.md`
- `apps/web/src/index.css` only if the operator chooses to change implementation tokens
- `PRODUCT.md` only if wording must be clarified to match the chosen direction

**Out of scope**:

- Component redesign.
- Adding light mode.
- Re-theming all pages beyond token-level changes.
- Changing layout, typography, or copy unrelated to color direction.

## Git workflow

- Branch: `advisor/010-design-color-reconciliation`
- Commit message depends on chosen path:
  - Docs-only: `docs: align design system with color tokens`
  - Token change: `feat(design): restore warm dark color tokens`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Choose one source-of-truth direction

Ask the operator which direction to make authoritative:

1. **Document cool slate**: keep current implementation tokens and update `DESIGN.md` to describe cool slate neutrals as intentional.
2. **Restore warm neutrals**: keep current `DESIGN.md` intent and retint the implementation tokens in `apps/web/src/index.css` away from hue 270 toward warm neutral hues.

Recommended default if the operator is unavailable: choose **Document cool slate**, because recent git history suggests the current implementation was intentional. Record this choice in the PR/commit description.

**Verify**: no command. You must have an explicit choice before editing. If no choice and you cannot use the recommended default, STOP.

### Step 2A: If documenting cool slate, update DESIGN.md

Revise only the color-direction sections of `DESIGN.md`:

- Replace “never cold blue-gray” with wording that matches the implemented cool slate cards/sidebar while preserving dark-only, restrained, game-vibe principles.
- Keep primary teal, secondary amber/gold, destructive rose/coral roles.
- Mention that base background may remain warmer while elevated surfaces can use cool slate for contrast.
- Remove or update “Warm Neutrals Rule” so it no longer contradicts `index.css`.

Do not change component guidance unrelated to color.

**Verify**: `grep -n "never cold blue-gray\|Warm Neutrals Rule\|cool slate" DESIGN.md` → no stale contradiction remains, and the new chosen direction is discoverable.

### Step 2B: If restoring warm neutrals, update CSS tokens

In `apps/web/src/index.css`, adjust neutral tokens in both `:root` and `.dark` blocks. Keep values dark-only and accessible. At minimum retint these hue-270 neutrals toward a warm hue family consistent with `--background`:

- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--border`, `--input`
- sidebar equivalents

Do not change typography or component classes. After editing, ensure `:root` and `.dark` remain consistent unless there is a documented reason for divergence.

**Verify**: `grep -n "0.008 270\|0.01 270\|0.012 270" apps/web/src/index.css` → no neutral token contradictions remain, or remaining matches are intentionally documented.

### Step 3: Run checks

**Verify**:

- `pnpm check` → exit 0.
- `pnpm check-types` → exit 0.

## Test plan

No unit tests required. Manual visual review should check the landing page, dashboard shell/sidebar, cards, popovers/dialogs, destructive actions, and focus rings in dark mode. If tokens changed, verify text contrast remains readable.

## Done criteria

- [ ] `DESIGN.md` and `apps/web/src/index.css` no longer contradict each other on warm vs cool neutrals.
- [ ] Dark-only rule remains intact.
- [ ] No unrelated component/layout changes.
- [ ] `pnpm check` and `pnpm check-types` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- The operator rejects both direction choices.
- The design direction requires a full visual redesign rather than docs/token reconciliation.
- Token changes create obvious contrast failures that cannot be fixed within neutral tokens.

## Maintenance notes

Future UI work should treat `DESIGN.md` plus `apps/web/src/index.css` as a paired contract: update both when changing visual direction. Reviewers should reject token changes that leave the design doc stale.

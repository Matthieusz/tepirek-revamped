<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->

---

name: Tepirek Revamped
description: Dark-mode guild management platform for Margonem players.

---

# Design System: Tepirek Revamped

## 1. Overview

**Creative North Star: "The Guild Hall Ledger"**

Tepirek is a dark-mode-only guild management tool that feels like a refined in-game interface rather than a detached web app. The aesthetic draws from Margonem's RPG world without mimicking its pixel art: structured data, clear hierarchies, and the quiet authority of a well-kept ledger. The interface is calm, focused, and distinctly nocturnal — designed for players who manage guild affairs between game sessions, often in low-light environments.

The system rejects both generic SaaS dashboard sameness and cluttered MMO fan-site chaos. It is modern and minimalistic with a game-vibe: every element earns its place, and the tool fades into the background so the game stays center stage. Polish copy feels natural and direct, not translated.

**Key Characteristics:**

- Dark surfaces with a warm near-black base and cool slate elevated layers; never pure black.
- Monospace for data and UI chrome; display type for major headings.
- Flat by default; motion is responsive feedback, not choreography.
- Information density is intentional, not inherited from MMO UI bloat.
- Color is structural: each hue has a specific job, not decorative noise.

## 2. Colors

The palette is a full, deliberate dark-mode system with four named roles. The base page background stays subtly warm and nocturnal, while elevated cards, popovers, sidebars, and borders use restrained cool slate neutrals for crisp separation.

### Primary

- **[To be resolved during implementation]** — A muted, earthy accent (desaturated teal or sage family) used for primary actions, active navigation, and focus states. Chroma kept moderate to avoid neon garishness against dark surfaces.

### Secondary

- **[To be resolved during implementation]** — Warm gold or amber family used for currency, rewards, bet values, and highlight statistics. This color carries the "treasure" feeling without being garish.

### Tertiary

- **[To be resolved during implementation]** — A subtle rose or coral family reserved for alerts, destructive actions, and urgent status indicators. Used sparingly.

### Neutral

- **Base neutral** — A warm near-black background that keeps the app nocturnal and avoids pure `#000`.
- **Elevated neutral** — Cool slate cards, popovers, sidebars, borders, and muted states that separate dense product surfaces without feeling corporate or neon.
- **Text neutral** — Soft light tones for primary text and icons on dark surfaces, tuned for readable contrast.

### Named Rules

**The Dark-Only Rule.** There is no light mode. Every color token is authored for dark surfaces first and exclusively. Contrast ratios are verified against dark backgrounds.

**The Cool Slate Layering Rule.** The root background may stay warm, but elevated surfaces use cool slate deliberately for product clarity. Cool slate is structural, not decorative: use it for cards, panels, sidebars, popovers, borders, and muted states.

## 3. Typography

**Display Font:** [font pairing to be chosen at implementation] — A bold, characterful display typeface for major headings and hero moments.

**Body Font:** [font pairing to be chosen at implementation] — A clean, highly legible sans-serif for longer reading and UI labels.

**Label/Mono Font:** [font pairing to be chosen at implementation] — A monospace typeface for data tables, stats, numbers, and technical UI chrome.

**Character:** The pairing evokes an RPG interface manual: authoritative display headlines, clean body copy, and precise monospace for the numbers that matter. The monospace is not decorative; it is functional — stats, gold amounts, player levels, and auction bids read clearer in a fixed-width rhythm.

### Hierarchy

- **Display** ([to be resolved], clamp(2.5rem, 6vw, 4rem), 1.1): Page titles, major section headers. Used rarely.
- **Headline** ([to be resolved], 1.5rem, 1.2): Sub-section titles, card headers.
- **Title** ([to be resolved], 1.125rem, 1.3): List item titles, form section labels.
- **Body** ([to be resolved], 1rem, 1.6): Descriptions, helper text, announcements. Max line length 70ch.
- **Label** ([to be resolved], 0.875rem, uppercase, 0.05em tracking): Table headers, badges, button text, navigation items.
- **Mono / Data** ([to be resolved], 0.875–1rem, 1.4): Numbers, stats, currency, player levels, auction values.

### Named Rules

**The Mono-for-Data Rule.** Any numeric value that carries game meaning (gold, levels, bids, rankings) is set in monospace. Prose stays sans.

## 4. Elevation

The system is flat-by-default with tonal layering as the primary depth mechanism. Surfaces are distinguished by subtle lightness shifts and cool slate borders, not by floating shadows.

Shadows are used sparingly and only as a response to state: hover elevation on interactive cards, focus rings, and modal/dialog overlays. When shadows appear, they are diffuse and warm-tinted, not harsh black drops.

### Shadow Vocabulary (if applicable)

- **[To be resolved during implementation]** — Ambient glow for hovered or focused interactive elements.
- **[To be resolved during implementation]** — Structural shadow for dialogs, sheets, and dropdown menus that must separate from the base layer.

### Named Rules

**The Flat-By-Default Rule.** Surfaces sit flat. Depth is conveyed through tonal contrast, not shadow. Shadows appear only as a response to state (hover, focus, elevation).

## 5. Components

[To be resolved during implementation. No component library exists yet for the new direction. Re-run `$impeccable document` in scan mode once components are built to capture real tokens and variants.]

## 6. Do's and Don'ts

### Do:

- **Do** keep the interface dark-mode only; verify all contrast against dark surfaces.
- **Do** use monospace for game-relevant numbers, stats, and data tables.
- **Do** let tonal layering (lightness shifts + cool slate borders) carry surface hierarchy before reaching for shadows.
- **Do** ensure Polish copy feels natural and direct, not translated or stiff.
- **Do** respect `prefers-reduced-motion`; even responsive feedback should be disableable.

### Don't:

- **Don't** introduce a light mode. The system is authored exclusively for dark surfaces.
- **Don't** use cool slate as decoration. It is reserved for structural elevated layers, borders, panels, and muted states.
- **Don't** use gradient text (`background-clip: text`). Emphasis comes from weight, size, or color role, not decorative gradients.
- **Don't** use side-stripe borders (colored `border-left` or `border-right` greater than 1px) as accents on cards or alerts. Use full borders, background tints, or leading icons instead.
- **Don't** use glassmorphism decoratively. Blurs and translucent panels are rare and purposeful, or absent.
- **Don't** use the hero-metric template (big number, small label, supporting stats, gradient accent).
- **Don't** create identical card grids (icon + heading + text repeated endlessly). Each workflow deserves a tailored layout.
- **Don't** reach for a modal as the first solution. Exhaust inline and progressive alternatives first.
- **Don't** use em dashes in copy. Use commas, colons, semicolons, or parentheses.

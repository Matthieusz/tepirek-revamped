# Upstream provenance

- Source repository: https://github.com/dmmulroy/anti-slop
- Source commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`
- Source path: `skills/install-anti-slop/assets/anti-slop/`
- Installed path: `tools/oxlint/anti-slop/`
- Installed assets: generic rules, Effect rules, shared helpers, and the vendored `eslint-stylistic` implementation and license.

## Local integration

- Oxlint loads the generic and Effect plugins directly from the installed TypeScript entry points.
- `@oxlint/plugins` is pinned to the installed Oxlint version (`1.82.0`).
- All generic and Effect rules from this snapshot are enabled at error severity. `no-runtime-typeof` preserves Ultracite's prior `allowInTypeGuards` option.
- The source assets are unchanged from the recorded snapshot. Local configuration additionally ignores repository agent metadata and the vendored plugin path.

# Upstream provenance

- Source repository: https://github.com/dmmulroy/anti-slop
- Source commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`
- Source path: `skills/install-anti-slop/assets/anti-slop/`
- Installed assets: the Effect plugin and its helpers in `tools/oxlint/anti-slop/effect/`.

## Local integration

- Oxlint loads the Effect plugin directly from its TypeScript entry point. Its five rules remain enabled at error severity.
- The generic vendored plugin was replaced by the 12 `quality` rules from [`@nkzw/oxlint-config@3.0.0`](https://github.com/nkzw-tech/oxlint-config), without adopting the broader preset or its sorting rules.
- All 10 recommended rules from [`@interfere/landmines@0.1.0`](https://github.com/interfere-inc/landmines) are enabled at error severity. `landmines-testing/no-test-doubles` covers module mocking, which previously had a dedicated rule.

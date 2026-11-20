# Upstream provenance

- Source repository: https://github.com/dmmulroy/anti-slop
- Source commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`
- Source path: `skills/install-anti-slop/assets/anti-slop/`
- Installed assets: the Effect plugin and its helpers in `tools/oxlint/anti-slop/effect/`.

## Local integration

- Oxlint loads the Effect plugin directly from its TypeScript entry point. Its five rules remain enabled at error severity.
- The 12 `quality` rules are inherited from [`@cloudflare/oxlint-config`](https://github.com/cloudflare/oxlint-config), which uses `@nkzw/oxlint-config` as its base.
- All 10 recommended rules from [`@interfere/landmines@0.1.0`](https://github.com/interfere-inc/landmines) are enabled at error severity. `landmines-testing/no-test-doubles` covers module mocking, which previously had a dedicated rule.

## Cloudflare migration exceptions

- Namespace imports remain allowed for Effect, and the existing array type syntax is unchanged.
- `no-console` is relaxed only in the query diagnostics module and architecture CLI, which intentionally write to the console.
- Unused-disable reporting and the rules for `instanceof`, unused assignments, raw strings, and encoding names are deferred to keep this migration free of application source changes.

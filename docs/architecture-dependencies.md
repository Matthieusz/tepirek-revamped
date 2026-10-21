# Dependency direction

Run `pnpm check:architecture`. CI runs the same command, including prohibited-import fixtures and the repository scan. The check uses Oxc parsing and resolution with workspace exports, relative paths, and tsconfig aliases; it follows local dependencies transitively, including barrels and type-only imports. Static imports, re-exports, literal dynamic imports, import types, and literal `require` calls are checked. Computed module names and third-party package internals are not analyzed.

## Rules

- API `domain/` cannot reach adapters, server, database, or auth implementation.
- API `services/` cannot reach those implementations, Drizzle, or Effect HTTP implementation. Services own policy and depend on application-owned ports.
- API `protocol/` is browser-consumable and cannot reach adapters, server, services, auth, database, or server observability.
- Web production `features/` cannot reach route implementations. Routes coordinate features, not the reverse.

These rules apply to both runtime and type dependencies. Test/spec files and API `test/` setup are exempt as roots so integration tests can compose real adapters. Production code importing them still has its entire reachable graph checked.

The browser-safe API package surface is `protocol/*` and `domain/squad-builder/*`. Preserve the package's `browser: null` exports for server-only entry points. This static check complements, rather than replaces, browser builds and conditional exports.

## Existing, exact-edge exceptions

The checker contains three explicit existing-debt edges, not directory-wide exemptions:

- `protocol/auth/current-session.ts` → `packages/auth/src/index.ts`: type-only derivation of the Better Auth session shape. It creates no runtime auth import, but still couples the browser contract's types to auth. Replace with an application-owned session projection when changing this contract.
- `services/legend-pricing/legend-catalog-sync.ts` → `adapters/legend-pricing/margonem-forum/margonem-forum-client.ts` and `margonem-forum-parser.ts`: the existing synchronizer directly composes the forum client/parser. Move that composition behind an application-owned source port when changing this workflow.

Traversal stops at these exact edges. All other edges remain enforced, including new imports from either origin. Do not expand exceptions to accommodate new code; remove them when the underlying dependency is corrected.

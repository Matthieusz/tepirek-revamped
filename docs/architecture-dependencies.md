# Dependency direction

Run `pnpm check:architecture`. CI runs the same command, including prohibited-import fixtures and the repository scan. The check uses Oxc parsing and resolution with workspace exports, relative paths, and tsconfig aliases; it follows local dependencies transitively, including barrels and type-only imports. Static imports, re-exports, literal dynamic imports, import types, and literal `require` calls are checked. Computed module names and third-party package internals are not analyzed.

## Rules

- API `domain/` cannot reach adapters, server, database, or auth implementation.
- API `services/` cannot reach those implementations, Drizzle, or Effect HTTP implementation. Services own policy and depend on application-owned ports.
- API `protocol/` and `domain/squad-builder/` are browser-consumable and cannot reach adapters, server, services, auth, database, Drizzle, or server observability.
- Web production code cannot reach API services, adapters, server implementation, or observability, even through relative paths or barrels. Public contracts may transitively use other pure domain modules.
- Web production `features/` cannot reach route implementations. Routes coordinate features, not the reverse.

These rules apply to both runtime and type dependencies. Test/spec files and API `test/` setup are exempt as roots so integration tests can compose real adapters. Production code importing them still has its entire reachable graph checked.

## Browser-safe contract surface

Browser consumers import from these public `@tepirek-revamped/api` paths:

- `protocol/*`: shared wire schemas, HTTP API declarations, errors, and session/middleware declarations. For example, `@tepirek-revamped/api/protocol/http-api-contract` provides `AppHttpApi`.
- `domain/squad-builder/*`: shared squad-builder identifiers and pure domain values required by those contracts. For example, `@tepirek-revamped/api/domain/squad-builder/app-user-id` provides the user identifier.

There is no public root barrel. Do not import API source files by relative path to bypass this surface. Services, adapters, handlers, application composition, and observability remain server-only. Preserve the package's existing conditional exports, including `browser: null` for server-only entry points; the architecture tests verify every export's browser condition, browser resolution of shared entry points, and Node resolution of server entry points.

The API workspace intentionally also owns server implementation and therefore depends on auth, database, Drizzle, and HTML parsing. Workspace dependency ownership alone is not evidence of a browser bundle leak. The transitive graph check covers the web's API imports and both contract surfaces, including type dependencies, subject to the exact existing session-type exception below. The web's separate Better Auth client integration is not part of this API contract surface. Static checks do not inspect third-party internals or prove bundle contents.

Validate with `pnpm check:architecture`, `pnpm --filter web check-types`, and `pnpm --filter web build`. The graph check complements, rather than replaces, browser builds and conditional exports.

### When to extract contracts

Keep contracts in the API workspace for now. Reconsider `packages/contracts` when a second client, package-consumption friction, or a demonstrated build/dependency-isolation problem justifies the manifests, import churn, and ownership decisions. Package separation would strengthen dependency ownership; it is not currently required just because server dependencies share this workspace.

If extracted, move (do not duplicate) only shared wire schemas, HTTP declarations, and required shared identifiers. Keep private domain orchestration and persistence in the API/server workspace. The contracts package must have no dependency on db, auth, or Drizzle. Re-run graph checks and the web type-check/build after migration.

## Existing, exact-edge exceptions

The checker contains three explicit existing-debt edges, not directory-wide exemptions:

- `protocol/auth/current-session.ts` → `packages/auth/src/index.ts`: type-only derivation of the Better Auth session shape. It creates no runtime auth import, but still couples the browser contract's types to auth. Replace with an application-owned session projection when changing this contract.
- `services/legend-pricing/legend-catalog-sync.ts` → `adapters/legend-pricing/margonem-forum/margonem-forum-client.ts` and `margonem-forum-parser.ts`: the existing synchronizer directly composes the forum client/parser. Move that composition behind an application-owned source port when changing this workflow.

Traversal stops at these exact edges. All other edges remain enforced, including new imports from either origin. Do not expand exceptions to accommodate new code; remove them when the underlying dependency is corrected.

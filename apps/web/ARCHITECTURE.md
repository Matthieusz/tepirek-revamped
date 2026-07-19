# Web architecture

## Route ownership

- Eager route files own URL parsing, parameter and search validation, guards, loaders, metadata, and route error policy.
- Large rendering implementations may live in `.lazy.tsx` route files.
- Code used by one route belongs beside it in private `-components`, `-hooks`, or `-state` directories.
- Code shared by multiple route branches belongs in `features/<feature>`.
- `components/ui` contains generic UI primitives. `lib` contains only genuinely cross-cutting infrastructure.
- Effect remains the application state and effect model unless an explicit architecture decision replaces it.

## Data loading

Route-critical data starts in route loaders. Interaction-only or continuously reactive data may remain component-driven.

Use `preloadAtomResults` with the request/router-scoped `atomRegistry` from route context. It mounts all supplied resource atoms before awaiting them, so independent requests start concurrently. The same registry is provided to React through `RegistryContext`, allowing components to reuse fresh loader results without a second cache or duplicate request. Cached failures are refreshed when the loader retries.

Never use a process-global registry for route data. `getRouter` creates a registry for each router instance, which isolates SSR requests and users. Mutations and optimistic state remain in their existing atoms.

## Route behavior

Every new route must define appropriate pending, error, empty, and retry behavior. Important routes need useful metadata; private routes must follow the dashboard indexing policy. Every icon-only control needs an accessible name.

## Verification

Run these commands before declaring a frontend phase complete:

```sh
pnpm check
pnpm check-types
pnpm test
pnpm check:unused
pnpm build
```

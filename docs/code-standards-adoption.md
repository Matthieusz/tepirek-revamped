# Code Standards Adoption

This document tracks the incremental adoption of the local coding standards in this repository. Use it as a lightweight guide for future PRs and agent work.

## Adoption Rule

For established code, prefer the standards for new and changed paths while respecting compatible local architecture.

- Improve the files you touch.
- Do not start broad migrations unless explicitly requested.
- Preserve compatibility at seams when existing code does not yet match the target pattern.
- Keep changes small, coherent, testable, and easy to review.

## Verification Gates

Use these commands as the default confidence gates for standards-adoption work:

```bash
pnpm check
pnpm check-types
pnpm test
pnpm test:integration
pnpm test:smoke
```

For small frontend-only or docs-only changes, a narrower subset may be acceptable, but guild-critical workflow changes should prefer the full set.

## Target Module Shape

Prefer this flow for new or changed guild-critical behavior:

```txt
router / route adapter
  -> schema parser / boundary parser
  -> service module
  -> domain module or persistence adapter
```

### Router / Route Adapter

Owns framework and protocol concerns:

- oRPC, Hono, TanStack Router, React form, or other framework-specific shapes.
- Authentication and authorization gates.
- Boundary input parsing.
- Translation from typed service failures to protocol-specific user-facing errors.
- Response projection for the caller.

Routers should avoid owning deep business rules when those rules can live in a service or domain module.

### Schema Parser / Boundary Parser

Owns conversion from unknown or less-structured input into refined values:

- HTTP/RPC inputs.
- Form payloads.
- Environment variables.
- Third-party responses.
- Database rows when reconstructing domain values.

Decoded data should not be trusted with `as SomeType`. Parse first, then pass refined values inward.

### Service Module

Owns workflow policy and effect sequencing:

- Coordinates domain logic, persistence, and external dependencies.
- Receives parsed/refined inputs, not raw framework shapes.
- Uses explicit dependencies where a real seam is useful.
- Returns typed expected failures where practical.

### Domain Module

Owns pure domain behavior:

- Invariants.
- Smart constructors.
- Branded types or value objects.
- State transitions.
- Pure calculations.
- Protocol and persistence projections when the projection belongs to that concept.

### Persistence Adapter / Query Module

Owns database details:

- Drizzle tables and SQL expressions.
- Persistence projections.
- Transactions.
- Row parsing when rows cross into service/domain logic.

## Standards Checklist for Changed Files

Use this checklist during implementation and review.

### Boundary Integrity

- [ ] Unknown, serialized, persisted, or framework-shaped input is parsed before service/domain logic sees it.
- [ ] Parsed/refined values are passed inward instead of raw DTOs.
- [ ] Third-party responses are treated as `unknown` until parsed.
- [ ] Environment variables are validated at startup or composition seams.

### TypeScript Contracts

- [ ] No new `any` unless it is local, hidden behind a precise interface, and justified with `SAFETY:`.
- [ ] No new non-null assertions.
- [ ] No decoded-data casts such as `body as CreateInput`.
- [ ] Unavoidable casts are local and documented with `SAFETY:`.
- [ ] Direct exports and public methods on exported classes have useful JSDoc when touched.
- [ ] Type-only imports use `import type` where applicable.
- [ ] New code avoids barrels and vague files like `utils.ts` unless matching an existing unavoidable convention.

### Expected Failures

- [ ] Normal-operation failures are represented explicitly where practical.
- [ ] Service/domain code does not need to know oRPC/Hono/React error types unless it is intentionally an adapter.
- [ ] Protocol-specific errors are translated at the protocol boundary.
- [ ] Thrown errors are reserved for defects, startup misconfiguration, boundary translation, or framework-required behavior.

### Async and Workflows

- [ ] Promises are awaited, returned, collected, or handed to explicit detached-work machinery.
- [ ] Transactions wrap multi-write state changes that must be atomic.
- [ ] Caller-owned cancellation is propagated where the API supports it.
- [ ] Concurrent or retried operations are idempotent or protected when guild-critical.

### Testing

- [ ] Guild-critical behavior is covered through real seams, preferably API/router integration tests with real Postgres.
- [ ] Tests verify observable behavior, not implementation details.
- [ ] No module mocks or method spies are introduced for core behavior.
- [ ] New tests use small explicit test data builders instead of large shared fixtures.
- [ ] Regression tests are added before risky refactors.

### Observability and Secrets

- [ ] Secrets are never logged, returned, snapshotted, or included in error details.
- [ ] Error summaries use stable tags, operation names, safe IDs, or explicitly safe fields.
- [ ] User-facing messages remain useful and safe.

### Frontend UX and Accessibility

- [ ] Interactive elements use semantic controls.
- [ ] Inputs have labels.
- [ ] Keyboard behavior is preserved.
- [ ] Error states are visible and understandable.
- [ ] Query invalidation is specific to the changed data.

## Current Adoption Tracks

Update this table as standards-adoption slices land.

| Track                         | Target                                                                     | Status | Notes                                                                                                                                                                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tooling coverage              | Narrow broad lint ignores while keeping generated files ignored            | Done   | `apps/web/src/routeTree.gen.ts` stays ignored. `apps/web/src/components/ui/*` stays ignored. All other files linted.                                                                                                        |
| Boundary parsers              | Extract reusable schemas for meaningful domain inputs                      | Done   | All routers (event, heroes, bet, vault, ranking, task, announcement, user) use named schemas from `schemas.ts`.                                                                                                             |
| Service modules               | Move workflow policy out of routers                                        | Done   | `heroBetLedger` and `userService` modules extracted; routers are thin delegation layers with `Result`-based error handling and `switch` boundary translation. Transactional guards throw `ORPCError` to abort transactions. |
| Expected failures             | Introduce typed expected failures inside service/domain modules            | Done   | `HeroBetLedgerError` discriminated union with `Result<T, E>` from better-result; translation at router boundaries.                                                                                                          |
| Real-seam tests               | Protect guild-critical workflows through API/router integration tests      | Done   | Integration tests cover: authorization gates, admin self-lockout guardrails, concurrent demotion serialization, user projections, deleteUser (4 tests), updateProfile, updateUserName. 83 integration tests total.          |
| Frontend mutation consistency | Standardize form validation, error display, and precise query invalidation | Done   | No touched mutation modals/pages to improve — `hero-bet-member-picker.tsx` is a presentation component.                                                                                                                     |
| Type escape hatches           | Remove or justify casts and suppressions in touched files                  | Done   | All touched files are clean. Remaining `as never`/`as SquadBuilderServices` casts are in untouched squad-builder code.                                                                                                      |

## Suggested Slice Order

1. Narrow `oxlint.config.ts` ignores one folder at a time.
2. Pick a small router, such as events, and extract named input schemas.
3. Move that router's workflow policy into a small service module.
4. Add or update integration tests for the behavior before refactoring riskier paths.
5. Convert one service operation to typed expected failures and boundary translation.
6. Repeat for heroes, auctions, bets, vault, users, and frontend mutation flows.

## Conventions to Preserve

- Keep Polish user-facing copy natural and direct.
- Use integration tests with a real Postgres database for guild-critical behavior.
- Keep generated files out of manual standards work.
- Prefer minimal, boring changes over broad architectural rewrites.
- Match the repo's existing formatter, linter, and monorepo commands.

## When to Stop and Ask

Stop and ask before continuing if a standards slice requires any of the following:

- Broad migrations across many unrelated files.
- Database migrations or data backfills.
- Public API contract changes.
- Authentication or authorization behavior changes not covered by tests.
- New libraries or framework-level architecture changes.
- Weakening TypeScript, lint, or test settings.

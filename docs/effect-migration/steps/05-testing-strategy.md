# Step 05 — Testing Strategy

Status: draft.

## Accepted first-slice strategy

Use three layers of evidence for `createSquadGroup`, with `@effect/vitest` for Effect-owned code and existing integration style for oRPC until the bridge is stable.

## Layer 1 — Effect service behavior test

- Place near the migrated module, e.g. `create-squad-group.test.ts`.
- Use `@effect/vitest` `it.effect`.
- Provide a small test `SquadGroupStore` Layer, not module mocks or spies.
- Assert observable behavior:
  - invalid name fails with typed `InvalidSquadGroupName`;
  - valid name calls the service seam and returns the expected summary.

## Layer 2 — Effect Drizzle persistence integration test

- Use real PostgreSQL, matching the existing integration-test philosophy.
- Use the native Effect Drizzle Layer.
- Assert `createSquadGroup` persists:
  - owner id;
  - refined name;
  - default/private visibility;
  - returned summary matching stored state.
- This proves `drizzle-orm/effect-postgres` behavior rather than a fake.

## Layer 3 — oRPC bridge/router integration test

- Use the same caller-facing router seam the frontend depends on.
- Assert:
  - valid RPC call creates a group and returns frontend-compatible output;
  - invalid input/domain error maps to the expected `ORPCError` / client-visible bad request behavior;
  - request logging path preserves safe typed failure summaries where applicable.

## Later full test runtime goal

After the reference slice is stable, introduce a fuller reusable Effect test runtime/layer composition pattern, based on Effect Solutions and `@effect/vitest` guidance:

- `it.effect` for Effect programs;
- automatic scoped resource cleanup;
- `TestClock` and `TestRandom` for deterministic time/randomness;
- reusable test Layers for service dependencies;
- shared suite Layers only for expensive resources that intentionally need suite-level lifecycle;
- no state leakage between tests unless deliberately scoped and reset.

## Guardrails

- Do not use `vi.mock`, `jest.mock`, `vi.spyOn`, or equivalent method-spy APIs.
- Replace behavior through real seams: Effect services/layers, local DB, or recording fake adapters.
- Persistence behavior depending on SQL, constraints, transactions, or query semantics uses a representative local PostgreSQL database.
- Tests assert observable outcomes, not private helpers or internal call order.
- Valid test values must be created through production schemas/parsers/smart constructors or schema-derived arbitraries.

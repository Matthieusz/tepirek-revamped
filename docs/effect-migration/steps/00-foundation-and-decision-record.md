# Step 00 — Foundation and Decision Record

Status: draft.

## Goal

Create enough shared migration structure that multiple sessions can continue the Effect v4 migration without re-litigating settled decisions or losing open questions.

## Inputs

- Project coding standards skill:
  - `EFFECT.md`: Services/Tags/Layers for dependency-bearing Effect modules, typed error channels, `Schema.TaggedErrorClass`, Effect-aware tests, resource-owning Layers.
  - `DOMAIN_MODELING.md`: refined values, legal states by construction, exhaustive variants, operation-specific inputs.
- Effect Solutions:
  - Services and Layers guidance: `Context.Service`, unique service identifiers, service methods returning dependency-free effects, Layers owning implementation and lifecycle, provide at composition boundary.
  - Error Handling guidance: `Schema.TaggedErrorClass`, `Effect.catchTag`/`Effect.catchTags`, expected errors vs defects, `Schema.Defect` for external unknown errors.
  - Data Modeling guidance: Schema-backed domain values and refined models.
- Current repo facts:
  - oRPC is the established RPC/frontend contract.
  - Hono is a thin Bun HTTP shell.
  - evlog currently owns request logging and structured error envelopes.
  - squad-builder is the largest backend module and contains the main Result/error/service orchestration complexity.

## Guardrails

- Do not big-bang convert unrelated modules without explicit step documentation.
- Do not mix constructor-injection and Effect Services inside a responsibility after it becomes Effect-based, except at a deliberate compatibility boundary.
- Expected failures remain typed Effect errors; defects are reserved for bugs/invariants that callers cannot recover from.
- Boundary input is parsed before core logic receives it.
- Sensitive values use Effect `Redacted` when they enter Effect-owned code.
- Layers that acquire cleanup-requiring resources own cleanup.

## Accepted runtime/provide boundary

Build one shared application Layer/runtime at the server composition root, then run migrated Effect programs from thin oRPC handler bridges.

Consequences:

- `packages/db` exposes reusable database Layers.
- `packages/api` exposes module/service Layers.
- `apps/server` or a nearby composition module assembles the production app Layer/runtime once.
- oRPC remains the HTTP boundary and uses a bridge helper to run migrated programs and translate typed errors to `ORPCError`.
- Production Layers are not constructed inside domain operations or per request.

## Initial planned work

1. Keep this folder as the durable migration planning artifact.
2. Answer open design questions one at a time and update `open-questions.md`.
3. Produce or update an ADR after the first core decisions are settled.
4. Only then start code changes.

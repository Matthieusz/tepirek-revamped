# Effect v4 Backend Migration Plan

Status: draft, multi-session planning artifact.

This folder tracks the planned migration of the backend toward Effect v4. The plan is intentionally split into small documented steps so work can span many sessions without losing decisions, open questions, or rationale.

## Current known decisions

- Migrate backend business/application code from `better-result` style `Result<T, E>` orchestration toward Effect v4 typed error channels.
- Keep **oRPC** initially as the HTTP/RPC contract and frontend TanStack Query integration layer.
- Keep **Hono** initially as the thin Bun-hosted HTTP shell for CORS, better-auth, oRPC RPC, and oRPC OpenAPI routes.
- Keep **evlog** during the initial Effect migration; evaluate replacement later as an observability-specific decision.
- Use the project coding standards skill as the local style source of truth, especially `EFFECT.md`, `DOMAIN_MODELING.md`, and later `ERROR_HANDLING.md`, `OBSERVABILITY.md`, `BOUNDARIES_AND_PARSING.md`, `DESIGNING_MODULES.md`, `ASYNC_AND_WORKFLOWS.md`, and `TESTING_AND_VERIFICATION.md` when those concerns are planned in detail.
- Use Effect Solutions documentation as external guidance for services/layers, tagged errors, and data modeling.
- Target **Drizzle ORM `v1.0.0-rc.4`** as part of the migration path. Drizzle `v1.0.0-rc.1` introduced native Effect v4 support; `v1.0.0-rc.4` is the desired target version and includes Effect driver updates/fixes, additional Effect SQL driver support, and a required `effect` version bump to `4.0.0-beta.83`.

## Current backend shape

- `packages/api`: oRPC routers and domain/application modules.
- `packages/api/src/modules/squad-builder`: largest backend module and likely reference migration candidate.
- `apps/server`: Bun + Hono edge that mounts better-auth, oRPC RPC, and oRPC OpenAPI handlers.
- `apps/web`: TanStack Start frontend that consumes oRPC through `@orpc/tanstack-query`.

## External references

- Effect services/layers: https://www.effect.solutions/services-and-layers
- Effect error handling: https://www.effect.solutions/error-handling
- Effect data modeling: https://www.effect.solutions/data-modeling
- Drizzle Effect PostgreSQL guide: https://orm.drizzle.team/docs/get-started/effect-postgresql-new
- Drizzle ORM releases: https://github.com/drizzle-team/drizzle-orm/releases

## ADR

- `../adr/0002-effect-v4-backend-migration.md` — top-level backend Effect migration architecture decision.

## Planning documents

- `implementation-readiness.md` — go/no-go checklist before implementation starts.
- `open-questions.md` — grilling session questions, recommendations, and decisions.
- `pr-tracking.md` — accepted long-running draft PR tracking strategy.
- `steps/00-foundation-and-decision-record.md` — initial decisions and setup work.
- `steps/01-drizzle-effect-v4-upgrade.md` — Drizzle rc.4 and Effect dependency plan.
- `steps/02-squad-builder-reference-migration.md` — reference module migration plan.
- `steps/03-effect-schema-boundary-migration.md` — oRPC boundary schema migration plan.
- `steps/04-observability-and-evlog.md` — evlog/Effect observability plan.
- `steps/05-testing-strategy.md` — first-slice and later full-runtime testing plan.
- `steps/06-error-model.md` — Effect tagged-error and oRPC mapping plan.
- `steps/07-implementation-sequence.md` — accepted initial implementation sequence.
- `steps/08-module-layout.md` — accepted first structural split layout.
- `steps/09-transaction-strategy.md` — accepted adapter-owned transaction strategy.

## Planning rule

Ask one design question at a time. Each answer updates `open-questions.md` and the affected step document.

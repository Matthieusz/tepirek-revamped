# Effect v4 Backend Migration Plan

Status: draft, multi-session planning artifact.

This folder tracks the planned migration of the backend toward Effect v4. The plan is intentionally split into small documented steps so work can span many sessions without losing decisions, open questions, or rationale.

## Current known decisions

- Migrate backend business/application code from `better-result` style `Result<T, E>` orchestration toward Effect v4 typed error channels.
- Remove **oRPC** route-by-route in favor of Effect `HttpApi` contracts and handlers.
- Keep **Hono** as the thin Bun-hosted HTTP shell for CORS, better-auth, request/auth seams, and mounting Effect `HttpApi` handlers.
- Fully remove **TanStack React Query** from the frontend end state. Frontend server state should use `@effect-atom/atom-react` runtime-backed atoms over shared Effect `HttpApi` client services, with query atoms, `Result` state rendering, and `Atom.optimistic` / `Atom.optimisticFn` for optimistic mutations.
- Keep **evlog** at external auth/Hono seams during the migration; Effect-owned responsibilities should move toward Effect logging/tracing layers.
- Use the project coding standards skill as the local style source of truth, especially `EFFECT.md`, `DOMAIN_MODELING.md`, and later `ERROR_HANDLING.md`, `OBSERVABILITY.md`, `BOUNDARIES_AND_PARSING.md`, `DESIGNING_MODULES.md`, `ASYNC_AND_WORKFLOWS.md`, and `TESTING_AND_VERIFICATION.md` when those concerns are planned in detail.
- Use Effect Solutions documentation as external guidance for services/layers, tagged errors, and data modeling.
- Target **Drizzle ORM `v1.0.0-rc.4`** as part of the migration path. Drizzle `v1.0.0-rc.1` introduced native Effect v4 support; `v1.0.0-rc.4` is the desired target version and includes Effect driver updates/fixes, additional Effect SQL driver support, and a required `effect` version bump to `4.0.0-beta.83`.

## Current backend shape

- `packages/api`: oRPC routers and domain/application modules.
- `packages/api/src/modules/squad-builder`: largest backend module and likely reference migration candidate.
- `apps/server`: Bun + Hono edge that mounts better-auth, oRPC RPC, and oRPC OpenAPI handlers.
- `apps/web`: TanStack Start frontend that consumes oRPC through `@orpc/tanstack-query`.

## Phase 2 Effect service module convention

Newly converted Effect-owned application services should use domain-named modules, not constructor-injected use-case classes. Prefer a module name that describes the domain capability, for example `account-access-invites.ts`, with an optional namespace re-export from a nearby barrel when that improves imports:

```ts
export * as AccountAccessInvites from "./account-access-invites.js";
```

Each service module should expose this shape:

1. `Interface` — the public service contract. Methods return `Effect<A, E, R>` with the same behavior and typed error channel as the migrated use case.
2. `Service extends Context.Service<Service, Interface>()("stable/service/identifier")` — the Effect service tag.
3. `use = serviceUse(Service)` — the standard helper used by callers that need one service method inside another Effect.
4. `layer = Layer.effect(Service, Effect.gen(...))` — the production implementation layer. Acquire dependencies with `yield* DependencyService`; do not instantiate use-case classes inside handlers.
5. Stable operation names via `Effect.fn("Domain.operation")` on public Effect-returning methods.

Account-sharing example:

```ts
import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type { AccountAccessInviteSummary } from "./account-sharing-store.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import type { SendAccountAccessInviteInput } from "./send-account-access-invite.js";

export interface Interface {
  readonly send: (
    input: SendAccountAccessInviteInput
  ) => Effect<AccountAccessInviteSummary, AccountSharingError>;
}

export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/AccountAccessInvites"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* makeAccountAccessInvitesService() {
    const store = yield* EffectAccountSharingStore;

    return {
      send: EffectRuntime.fn("AccountAccessInvites.send")(
        function* send(input) {
          const now = new Date(yield* Clock.currentTimeMillis);

          return yield* store.upsertAccountAccessInvite({
            accountId: input.accountId,
            invitedUserId: input.invitedUserId,
            now,
            ownerUserId: input.actorUserId,
          });
        }
      ),
    };
  })
);
```

HTTP/RPC handlers should consume these services from the provided runtime/layers. They should not call `new SomeUseCase(...)` for services already migrated to this shape; construction belongs in layers and the server composition root.

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
- `pr-24-review-next-steps.md` — review-driven next steps for the current PR; runtime ownership is now moved to the server composition root.
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

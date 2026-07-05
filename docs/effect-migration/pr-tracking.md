# Effect v4 Migration PR Tracking

Status: active; PR 24 is the tracking umbrella. The roadmap lives in the PR body.

PR: https://github.com/Matthieusz/tepirek-revamped/pull/24

## Strategy

A long-running draft PR tracks the migration across sessions. The PR body holds the phased roadmap and acceptance criteria. Phase 6 cleanup is drafted locally in `steps/10-phase-6-effect-cleanup.md` until the PR body is updated. This file records only the tracking strategy and draft policy. Creating branches, commits, pushes, or GitHub PRs is externally visible and should only happen after an explicit action request.

## Phase 6 PR-body update draft

Use this concise block when updating PR 24:

```md
## Phase 6 — Effect cleanup

Current status: `web`, `api`, and `server` type-check; direct oRPC/React Query source usage is gone; squad-builder placeholder atoms and missing CRUD/detail `HttpApi` endpoints have been replaced.

Remaining cleanup before leaving Draft:

1. Add final-handler integration tests for the six squad-builder endpoints used by the web app.
2. Convert dependency-bearing squad-builder services from `Layer.succeed` wrappers to `Layer.effect` services that close over store/config/client dependencies.
3. Reuse one `makeLiveDatabaseLayer(databaseUrl)` reference per app layer construction to avoid duplicate Effect Drizzle/Pg layers.
4. Provide `Observability.layer` to the actual server `AppHttpApiLayer` before `HttpRouter.toWebHandler(...)`; complete OTLP resource metadata.
5. Make squad-builder Effect Atom mutations refresh or optimistically update every visible affected list/detail/count atom.
6. Keep schemas owned by domain/API slice files and let `http-api-contract.ts` compose them. Do not create a global schema dumping ground.
7. Replace generic frontend Effect error rendering with tag-based domain mappers and one safe defect fallback.
8. Treat remaining promise/AppError modules as legacy compatibility until each module is explicitly migrated end-to-end.

Verification currently passing locally: `pnpm -F web check-types`, `pnpm -F @tepirek-revamped/api check-types`, `pnpm -F server check-types`, `pnpm -F @tepirek-revamped/api test`, `pnpm -F web test`, `pnpm check`.
```

## Branch

```txt
effect-v4-backend-migration
```

## PR title

```txt
Draft: Effect v4 backend migration
```

## PR links

The PR body links:

- `docs/adr/0002-effect-v4-backend-migration.md`
- `docs/effect-migration/README.md`
- `docs/effect-migration/implementation-readiness.md`
- `docs/effect-migration/pr-24-review-next-steps.md`

## Draft policy

Keep the PR as Draft until at least:

- the squad-builder Effect `HttpApi` reference slice is green (Phase 2);
- the frontend Effect Atom migration for squad-builder is green (Phase 5);
- the Phase 6 cleanup plan is complete enough that the web app is type-green, placeholder atoms are gone, and Observability is real;
- frontend type inference and OpenAPI generation compatibility have been verified (Effect `OpenApi.fromApi`).

## Splitting policy

If the PR becomes too large to review effectively, split follow-up PRs by phase while keeping the original PR as the umbrella reference.

# Effect v4 Migration PR Tracking

Status: draft; accepted strategy.

## Strategy

Create a long-running draft PR after the planning docs are committed, then use that PR as the tracking umbrella for the migration slices.

Creating branches, commits, pushes, or GitHub PRs is externally visible and should only happen after an explicit action request.

## Recommended branch

```txt
effect-v4-backend-migration
```

## Recommended PR title

```txt
Draft: Effect v4 backend migration
```

## Recommended PR links

The PR body should link:

- `docs/adr/0002-effect-v4-backend-migration.md`;
- `docs/effect-migration/README.md`;
- `docs/effect-migration/implementation-readiness.md`;
- `TODO-27ce79a0`.

## Recommended PR checklist

- [ ] Commit planning docs and ADR.
- [ ] Dependency/platform upgrade.
- [ ] Squad-builder structural split.
- [ ] Effect infrastructure/runtime bridge.
- [ ] `createSquadGroup` Effect reference slice.
- [ ] `createSquadGroup` Effect Schema boundary migration.
- [ ] Continue squad-builder operation migrations.
- [ ] Introduce fuller reusable Effect test runtime/layer composition.
- [ ] Revisit evlog replacement after reference migration stabilizes.
- [ ] Revisit oRPC/Hono only after backend migration stabilizes.

## Draft policy

Keep the PR as Draft until at least:

- the `createSquadGroup` Effect reference slice is green;
- the same procedure's Effect Schema boundary migration is green;
- frontend type inference and OpenAPI generation compatibility have been verified.

## Splitting policy

If the PR becomes too large to review effectively, split follow-up PRs by checklist slice while keeping the original PR/task as the umbrella reference.

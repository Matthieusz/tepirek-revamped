# Effect v4 Migration PR Tracking

Status: active; PR 24 is the tracking umbrella. The roadmap lives in the PR body.

PR: https://github.com/Matthieusz/tepirek-revamped/pull/24

## Strategy

A long-running draft PR tracks the migration across sessions. The PR body holds the phased roadmap (Phase 1–5) and acceptance criteria; this file records only the tracking strategy and draft policy. Creating branches, commits, pushes, or GitHub PRs is externally visible and should only happen after an explicit action request.

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
- the frontend `effect-query` migration for squad-builder is green (Phase 4);
- frontend type inference and OpenAPI generation compatibility have been verified (Effect `OpenApi.fromApi`).

## Splitting policy

If the PR becomes too large to review effectively, split follow-up PRs by phase while keeping the original PR as the umbrella reference.

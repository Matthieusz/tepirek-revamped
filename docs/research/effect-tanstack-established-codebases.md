# Effect + TanStack: established codebases

Follow-up to [effect-tanstack-architecture-comparison.md](effect-tanstack-architecture-comparison.md) and [effect-tanstack-external-sources.md](effect-tanstack-external-sources.md). The prior reports compared tepirek against T3 Code, Answer Overflow, AnimeKaiser, and one official TanStack example. This snapshot extends coverage to the biggest established Effect and TanStack codebases themselves, verified against GitHub primary sources at pinned SHAs on 2026-10-21 with `gh api`. No claim below relies on memory; anything I could not verify is marked as such.

## Scope and limitations

- Library monorepos are not applications. `Effect-TS/effect` and `TanStack/router` prove conventions for _library_ organization and intra-repo discipline, not app architecture.
- Production overlap is rare. GitHub code searches for `@tanstack/react-start` + `effect` in `package.json` surfaced only small projects and templates. The prior reports' T3 Code / Answer Overflow / AnimeKaiser set remains the strongest app-level comparison.
- Star counts establish visibility, not correctness.

### Sources inspected

| Reference | Stars | What it is |
| --- | --- | --- |
| `Effect-TS/effect` @ `81fc8d9` | 17,342 | The Effect library monorepo (Effect 4) |
| `TanStack/router` @ `ed55775` | 15,239 | Router + Start monorepo (40 platform packages, 55 React examples) |
| `triggerdotdev/trigger.dev` @ `51b39fb` | 16,591 | Established production Effect adopter (workflow automation platform) |

## Effect-TS/effect — the Effect 4 monorepo

### Observed structure

Pinned source: [`Effect-TS/effect`](https://github.com/Effect-TS/effect/tree/81fc8d9c7855d0f31bf493f379ec7bc2a6150a6f).

- Eight workspace packages: `ai`, `atom`, `effect`, `opentelemetry`, `platform`, `sql`, `tools`, `vitest` ([contents/packages](https://github.com/Effect-TS/effect/tree/81fc8d9c7855d0f31bf493f379ec7bc2a6150a6f/packages)).
- **Effect 4 collapsed capabilities into one core package.** [`packages/effect/src`](https://github.com/Effect-TS/effect/tree/81fc8d9c7855d0f31bf493f379ec7bc2a6150a6f/packages/effect/src) holds flat module files (`Schema.ts`, `Layer.ts`, `Metric.ts`, ...) _plus_ capability subdirectories: `http-api/`, `http/`, `net/`, `socket/`, `sql/`, `rpc/`, `persistence/`, `workflow/`, `cluster/`, `ai/`, `cli/`, `eventlog/`, `observability/`. What was a package per capability in Effect 3 is now a subdirectory of the core package, fronted by an `index.ts` and an `internal/` directory.
- Platform packages are now thin runtime bindings only: `platform/bun`, `platform/browser`, `platform/deno`, `platform/node`, `platform/node-shared` ([contents/packages/platform](https://github.com/Effect-TS/effect/tree/81fc8d9c7855d0f31bf493f379ec7bc2a6150a6f/packages/platform)).
- Per-package structure: `src/`, `test/`, `typetest/`, `benchmark/` (see [`packages/effect`](https://github.com/Effect-TS/effect/tree/81fc8d9c7855d0f31bf493f379ec7bc2a6150a6f/packages/effect)), plus per-package guide docs co-located with the code (`HTTPAPI.md`, `SCHEMA.md`, `CONFIG.md`, `MCP.md`).
- Root tooling ([root package.json](https://github.com/Effect-TS/effect/blob/81fc8d9c7855d0f31bf493f379ec7bc2a6150a6f/package.json)): pnpm 11, `prepare` runs `effect-tsgo patch` (same pattern tepirek already adopted), Vitest, oxlint + dprint, `tsc -b` project references, a dedicated `circular` script (`scripts/circular.mjs`) that fails on circular imports, `tstyche` type tests, changesets.

### Takeaways for tepirek

- **Validates the single `packages/api` workspace.** The biggest Effect codebase in the ecosystem keeps protocol (`http-api`), domain (`schema`), services, and persistence concepts inside one core package and extracts only alien runtime bindings. tepirek's `packages/api` with `protocol/domain/services/adapters` and a thin Hono host mirrors this. It also supports the previous report's "adopt later, conditionally" stance on extracting a `packages/contracts` workspace.
- **Adoptable now, cheap:** a circular-import check over `packages/api` (Effect keeps one as a root script; tepirek already runs `knip`, so this is one extra rule/script). It is a weak, zero-maintenance proxy for the dependency-direction rules the main report wants enforced.
- **Adoptable where it pays:** per-package guide co-location (Effect keeps `HTTPAPI.md` next to the contracts that implement it). tepirek documents architecture in `CONTEXT.md`; a `packages/api/README.md` covering the protocol/services/adapters seam would live with the code. Small win; not a structural move.
- Already aligned: `effect-tsgo patch`, oxlint-based linting, Vitest, pnpm workspaces.

## TanStack/router — Router + Start monorepo

### Observed structure

Pinned source: [`TanStack/router`](https://github.com/TanStack/router/tree/ed5577593a749b8c7193cc7b5d945fd084bfac2f).

- ~40 platform packages with a deliberate core/adapter split: `router-core`, `start-client-core`, `start-server-core`, `start-plugin-core`, then per-framework adapters (`react-router`, `solid-router`, `vue-router`, `react-start`, ...), plus validators as swappable adapters (`zod-adapter`, `arktype-adapter`, `valibot-adapter`) and framework lint plugins. Notably, [`packages/AGENTS.md`](https://github.com/TanStack/router/tree/ed5577593a749b8c7193cc7b5d945fd084bfac2f/packages/AGENTS.md) documents where shared logic belongs.
- Validation is segmented into affected targets — `test:eslint`, `test:unit`, `test:e2e`, `test:types`, `test:build` — run via Nx `affected`/`run-many` ([root package.json](https://github.com/TanStack/router/blob/ed5577593a749b8c7193cc7b5d945fd084bfac2f/package.json)), plus bundle-size and SSR/memory benchmark scripts.
- **Examples are small.** `examples/react` has 55 examples; the largest inspected (`start-large`, `kitchen-sink-react-query`) are dozens of files ([start-large src](https://github.com/TanStack/router/tree/ed5577593a749b8c7193cc7b5d945fd084bfac2f/examples/react/start-large/src)). `start-large` organizes routes with `params/` and `search/` subdirectories and a `typePrimitives.tsx`; `start-basic-react-query` is `routes/` + `components/` + `router.tsx` + `utils/`. **TanStack itself provides no evidence for how a large TanStack Start _application_ should organize features** — the app-structure evidence in the prior reports (T3 Code, Answer Overflow) remains the best available.
- [`AGENTS.md`](https://github.com/TanStack/router/blob/ed5577593a749b8c7193cc7b5d945fd084bfac2f/AGENTS.md) encodes repo discipline: read nested `AGENTS.md` before editing a subtree; start bug fixes with a failing regression test against public APIs; delete a feature's tests when deleting the feature; never hand-edit `pnpm-lock.yaml` or `routeTree.gen.ts`; a mandatory bundle-size optimization pass for any change affecting emitted client JavaScript.

### Takeaways for tepirek

- **Adopt the generated-file rule explicitly:** never hand-edit `routeTree.gen.ts` (and regenerate via build/dev-server). If `apps/web/AGENTS.md` or the repo `AGENTS.md` does not state this yet, it is a one-line, high-value addition.
- **Adopt the bundle gate selectively:** TanStack requires a bundle-size check for any client-emitting change. tepirek removed its bundle-analysis plugins (commit `62e0105`, 2026-08-28). Rather than reinstating heavy analysis, a lightweight size check before/after structural UI moves matches the main report's acceptance criterion ("check bundle output after moving UI").
- **Keep the prior report's feature-ownership change.** Since TanStack's examples do not model large-app organization, T3 Code / Answer Overflow remain the reference for that section; nothing in TanStack's own repo contradicts it.
- tepirek's `vp run` task pipeline already realizes the "segmented test targets" idea (unit / integration / smoke / type-check).

## trigger.dev — established production Effect adopter

### Observed structure

Pinned source: [`triggerdotdev/trigger.dev`](https://github.com/triggerdotdev/trigger.dev/tree/51b39fbc6ff0eeeda78fd292d974e7aaa747a086).

- Verified Effect usage in five manifests via code search: `apps/webapp`, `packages/core`, `packages/trigger-sdk`, `packages/schema-to-json`, `internal-packages/otlp-importer`; [`apps/webapp/package.json`](https://github.com/triggerdotdev/trigger.dev/blob/51b39fbc6ff0eeeda78fd292d974e7aaa747a086/apps/webapp/package.json) declares `effect: ^3.21.2`. **TanStack presence is limited to `@tanstack/react-table` / `react-virtual` / `match-sorter-utils`** — no Query, no Start. It is an Effect+Remix comparison, not Effect+TanStack-Query.
- The Remix `apps/webapp/app` organizes server code into `services/`, `models/`, `presenters/`, plus `hooks/`, `routes/`, and a dedicated `runEngine/` ([app listing](https://github.com/triggerdotdev/trigger.dev/tree/51b39fbc6ff0eeeda78fd292d974e7aaa747a086/apps/webapp/app)). The `presenters/` layer sits between routes and services/models for read-side shaping.
- Verification tooling: Turbo, `knip.ts`, lefthook, oxlint + oxfmt, Playwright, segmented Vitest configs (`vitest.config.ts`, `vitest.e2e.config.ts`, `vitest.perf.config.ts`, `vitest.bench.config.ts`), a nested `AGENTS.md` inside the webapp, integration test projects (`internal-test-projects.mts`).
- I did **not** verify how trigger.dev defines individual Effect services internally (no `Effect.Service` string matches in my code search; service style was not established) — treat the directory-level pattern as the observation, not class/tag style.

### Takeaways for tepirek

- **Independent confirmation of tepirek's seam layout.** A 16k-star production app keeps services, models, and presenters as separate server-side tiers — the same direction as tepirek's `services/` vs `server/` handlers and web presenters. No adoption needed; keep it.
- **Read-side presenters as a named layer** is a pattern worth borrowing _where read-shaping logic is being duplicated today_ (tepirek already has scattered `*-presenters.ts` files in routes). Formalizing them under the owning feature instead of a global `presenters/` folder fits tepirek better than copying trigger.dev's layout.
- Table-stakes alignment confirmed again: knip, oxlint-family linting, segmented test configs, hook dispatcher — tepirek already runs all of these via Vite+.

## Ecosystem scan (what was _not_ found)

GitHub code search, 2026-10-21:

- `"@tanstack/react-start" "effect" filename:package.json` → 30 results, all small projects, drafts, or templates (largest-theme: personal apps and repros; none established). Conclusion: **a production-scale public Effect + TanStack Start application has not surfaced beyond the prior reports' set.**
- `"effect-query" filename:package.json` → the `effect-query` bridge has real adopters (e.g. `playfulprogramming/playfulprogramming` — 227 stars, pushes October 2026, `@tanstack/react-query` 5.x; `magnitudedev/magnitude`), but nothing at the scale of tepirek's prior comparison set.
- `unkeyed/unkey` (5,472 stars) was a TS Effect candidate; verification shows the repo is now a Go backend (`cmd/`, `pkg/`, `internal/`, `go.mod`). **Excluded.**

## Consolidated deltas vs the main comparison

| Main-report position | New evidence | Delta |
| --- | --- | --- |
| Defer `packages/contracts` extraction | Effect 4 keeps http-api/schema/sql in one core package; only runtime bindings split out | Strengthened — do not extract |
| Frontend feature ownership pilot (squad-builder) | TanStack examples are too small to model large-app organization | Unchanged — T3/AnswerOverflow remain the reference |
| Encode dependency direction in CI | Effect ships a circular-import check script | Add a circularity check + import rules now, cheap |
| bundle-output acceptance criterion after UI moves | TanStack mandates a bundle-size pass for client-emitting changes | Adopt a lightweight size gate |
| Keep client-runtime/transport lifetimes documented | TanStack's AGENTS.md encodes server/client lifetime rules in prose | Document generated-file + lifetime rules in scoped agent docs |

[Effect-TS/effect src]: https://github.com/Effect-TS/effect/tree/81fc8d9c7855d0f31bf493f379ec7bc2a6150a6f/packages/effect/src
[Effect-TS/effect root]: https://github.com/Effect-TS/effect/blob/81fc8d9c7855d0f31bf493f379ec7bc2a6150a6f/package.json
[TanStack/router root]: https://github.com/TanStack/router/blob/ed5577593a749b8c7193cc7b5d945fd084bfac2f/package.json
[TanStack/router AGENTS.md]: https://github.com/TanStack/router/blob/ed5577593a749b8c7193cc7b5d945fd084bfac2f/AGENTS.md
[trigger.dev webapp app]: https://github.com/triggerdotdev/trigger.dev/tree/51b39fbc6ff0eeeda78fd292d974e7aaa747a086/apps/webapp/app

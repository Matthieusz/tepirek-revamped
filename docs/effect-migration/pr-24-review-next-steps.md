# PR 24 Review Next Steps

Status: superseded by the PR 24 roadmap.

The review-driven next steps are tracked as phased tasks in the PR 24 body: https://github.com/Matthieusz/tepirek-revamped/pull/24

Phase 5 was revalidated locally on 2026-07-04. The follow-up cleanup plan is in `steps/10-phase-6-effect-cleanup.md` and should be copied into the PR body after approval for an externally visible PR update.

## Resolution mapping

| Original review item                                                | Status        | Where it lives now                                                            |
| ------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------- |
| 1. Move production runtime ownership to the server composition root | ✅ completed  | PR "Done in this PR"                                                          |
| 2. Split the single Effect store into sub-domain services           | ✅ completed  | PR "Done in this PR"                                                          |
| 3. Scope/dispose ManagedRuntime in tests                            | ✅ completed  | `packages/api/src/test/effect.ts` scoped `testEffect` / `liveEffect` helpers  |
| 4. Move constructor-injected deps into Effect services/layers       | 🔴 Phase 1    | PR roadmap                                                                    |
| 5. Classify defects separately in the oRPC/Effect bridge            | ~~dissolved~~ | oRPC removal deletes the bridge; `HttpApi` maps typed `E` vs defects natively |
| 6. Replace `cause: Schema.Unknown` with safe defect representation  | 🔴 Phase 1    | PR roadmap — `Schema.Defect`                                                  |

The oRPC removal (Effect `HttpApi` + Effect Atom frontend state) dissolved item 5 entirely and made item 6 a consequence of the error-model promotion rather than a bridge-specific fix. See the PR description for the full phased roadmap.

## Phase 2 service-module convention

The target module shape for Phase 2 conversions is documented in `README.md#phase-2-effect-service-module-convention`. In short: newly converted Effect-owned services should live in domain-named modules, define an `Interface`, expose `Service extends Context.Service`, `use = serviceUse(Service)`, and `layer = Layer.effect(...)`, optionally provide a namespace re-export such as `export * as AccountAccessInvites from "./account-access-invites.js"`, name public methods with `Effect.fn("Domain.operation")`, and keep handlers from instantiating migrated use-case classes directly.

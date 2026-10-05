# Firecrawl scrape request lifecycle implementation plan

## Goal and scope

Implement candidate 1 from `/tmp/architecture-review-20261005-121819.html`: put the repeated profile-scrape request lifecycle behind one deep module, used by Margonem account import and refetch.

This is a behavior-preserving refactor. The module owns reservation, scraping, credit parsing, completion, failure recording, and interruption cleanup. The two workflows retain their distinct authorization, profile parsing, timestamps, diff computation, and pending-preview persistence.

No new retries, timeouts, schema migrations, budget policy, generic scraping framework, HTTP contract changes, or frontend changes.

## Current behavior to preserve

The duplicated implementation is in:

- `packages/api/src/services/squad-builder/account-import/preview-margonem-profile-import-service.ts:107–181`
- `packages/api/src/services/squad-builder/account-refetch/preview-account-refetch-service.ts:54–128`

Both use the existing `FirecrawlClientService`, `FirecrawlConfigService`, and `FirecrawlRequestAccountingStoreService` seams.

| Situation | Existing behavior |
| --- | --- |
| Import preflight | Parse profile URL and reject unavailable profile access before reserving or scraping. |
| Refetch preflight | Load the account and enforce ownership through its store before reserving or scraping. |
| Reservation | Derive the year/month from the current Effect clock; pass both configured request limits, profile ID, and actor ID to the accounting store. |
| Reservation failure | Propagate the budget or persistence failure without scraping or recording completion. |
| Scrape succeeds | Parse credits, persist successful accounting, then return HTML to the workflow. |
| Credits omitted | Use one credit. The existing nullish fallback must remain unchanged. |
| Credits present | Accept finite, non-negative safe integers, including zero; reject other numbers. |
| Optional completion metadata | Persist absent cache state and status code as `null`; preserve present values. |
| Typed scrape failure | Record failure with the scrape error's `_tag`, then propagate that error. |
| Invalid credits | Record `FirecrawlResponseNotParseable`, then return that error with the profile ID and the existing safe cause message. |
| Failure-recording persistence fails | Propagate the persistence failure instead of the original scrape/credit failure. |
| Success-recording persistence fails | Propagate the persistence failure; do not return HTML, retry, or add a compensating failure write. |
| Interrupted reserved lifecycle | Run the existing interruption cleanup with error tag `Interrupted`; cancellation remains cancellation. |
| Profile HTML parsing fails afterward | The scrape is already accounted as successful. Do not change its status to failed. |
| Pending-preview persistence fails afterward | Successful scrape accounting remains intact. |

Important persistence facts:

- The Drizzle adapter serializes budget reservation with a monthly PostgreSQL advisory transaction lock.
- Global-budget exhaustion is checked before per-user exhaustion.
- `reserved`, `succeeded`, and `failed` requests all count toward request budgets. Failure does not refund a request.
- The reservation transaction ends before the remote scrape starts.
- Completion updates are not guarded status transitions. This refactor must not claim durable exactly-once finalization or crash recovery.

The accounting store also serves `packages/api/src/adapters/legend-pricing/margonem-forum/margonem-forum-client.ts`. Its URL scraping, error translation, and interruption scope differ. Leave that caller and the shared accounting contract unchanged.

## Proposed module and interface

Create `packages/api/src/services/squad-builder/firecrawl-scrape-request.ts`.

Expose one named `Effect.fn` operation, `scrapeProfile`, with:

- **Input:** required, readonly `actorUserId: AppUserId` and `profileId: MargonemProfileId`.
- **Success:** readonly `html: string` and `creditsUsed: FirecrawlCreditCount`.
- **Expected failures:** existing `FirecrawlBudgetError`, `FirecrawlScrapeError`, and `SquadBuilderPersistenceUnavailable` variants; no new runtime error tags.
- **Effect requirements:** the three existing Firecrawl client, configuration, and accounting services.
- **Contract:** success means successful accounting has completed, not that the HTML is a valid Margonem profile or that a preview has been persisted.

Use exported named input/output/error types and document their contracts. Keep the reservation ID, budget summary, raw metadata, and lifecycle helpers private.

Choose a directly imported Effect operation, matching the existing preview modules. Do not add another `Context.Service`, implementation layer, or mockable forwarding interface. The actual replaceable dependencies already have production and test adapters; `server/effect-app.ts` needs no new wiring.

### Implementation shape

1. Resolve existing dependencies and obtain the reservation month from Effect time.
2. Reserve one request with the configured global and per-user limits.
3. Execute the existing post-reservation lifecycle with interruption cleanup:
   - Scrape the profile.
   - Record and propagate typed scrape failures.
   - Parse the nullish-defaulted credit count and translate malformed credits.
   - Record success with completion time and normalized optional metadata.
   - Return only HTML and refined credits.
4. Keep Margonem HTML parsing outside this operation.

Use typed-error handling for expected failures. Do not catch defects as ordinary scrape errors or swallow accounting failures. Keep the Firecrawl API key redacted; do not add payload, HTML, environment, or cause logging.

### Cancellation constraint

Preserve the existing interruption scope: it covers scraping, credit parsing, and success recording, but not reservation or later workflow work. Do not move `onInterrupt` around the entire preview, and do not make the network request uninterruptible.

Before extraction, characterize cancellation while completion is pending and cleanup persistence fails using deterministic test gates. Assert the full Effect exit/cause where relevant, not a newly invented error translation. Reservation handoff cancellation and process-crash recovery are not proven safe by the current code. If these probes reveal a gap, record it explicitly rather than silently introducing new masking, atomic-status, or recovery semantics in this refactor.

## Implementation sequence

### 1. Establish the behavior baseline

- [ ] Run the existing import, batch-import, and refetch tests before changing production code.
- [ ] Add targeted characterization cases through the existing preview interface for error precedence and successful accounting before HTML parsing.
- [ ] Characterize interruption during pending success recording and cleanup failure before changing finalizer composition.
- [ ] Use `it.effect`, controlled Effect time, and `Deferred` gates; no sleeps, live Firecrawl calls, method spies, or module mocks.

Keep fixtures small. Use the existing test-store construction helpers and complete client test adapters; only add local record/gate helpers where the new suite needs them.

### 2. Introduce and test the deep module

- [ ] Add `firecrawl-scrape-request.ts` and `firecrawl-scrape-request.test.ts`.
- [ ] Move the lifecycle implementation, preserving failure precedence and interruption scope.
- [ ] Test through `scrapeProfile`, supplying adapters at the existing dependency seams.
- [ ] Observe returned values, typed failures, Effect exits, and accounting-adapter records. Do not test private helpers or incidental internal call order.

Required module coverage:

| Case | Evidence |
| --- | --- |
| Successful scrape | Correct HTML and branded credits returned; reservation records actor, profile, month, and both limits; completion records metadata and controlled time. |
| Missing credits and metadata | Credits default to one; absent completion fields become `null`. |
| Zero credits | Zero survives parsing and accounting without defaulting to one. |
| Malformed credits | Parameterized negative, fractional, non-finite, and unsafe-integer cases return `FirecrawlResponseNotParseable` and record its tag, not success. |
| Both budget errors | Preserve the original variant; no scrape attempt or completion record. |
| Reservation persistence error | Preserve its operation/error fields; no scrape attempt or completion record. |
| Both typed scrape errors | Record their tags and propagate the original errors when accounting succeeds. |
| Failure recording fails | Return the persistence failure, preserving its operation fields. |
| Success recording fails | Return the persistence failure; no HTML success result, retry, or extra completion write. |
| Interrupted scrape | Exactly one interruption failure record for the controlled pending scrape; the exit still contains interruption. |
| Completion interruption / cleanup failure | Match the characterized baseline exit and records; do not turn cancellation into success or discard cleanup failures. |
| Interleaved requests | A gated pair keeps each actor, profile, credits, and completion attached to its own reservation ID. |

The interleaving test protects module-local request state; it does not replace PostgreSQL budget-concurrency tests.

### 3. Switch both workflows and remove duplication

- [ ] In import preview, call `scrapeProfile` only after URL parsing and duplicate-access checks.
- [ ] In refetch preview, call it only after `getAccountForRefetch` succeeds.
- [ ] Pass returned HTML to the unchanged profile parser and use returned credits in the existing outputs.
- [ ] Preserve `lastFetchedAt`/`fetchedAt` timing and refetch's 30-minute pending-preview expiry.
- [ ] Delete duplicated reservation/finalization/interruption blocks and their unused imports/constants.
- [ ] Keep existing preview error unions and HTTP error mappings compatible; avoid unrelated cleanup.

### 4. Concentrate tests without losing workflow evidence

- [ ] Move lifecycle-only characterization assertions into the new module suite once both callers use it.
- [ ] Remove the duplicated import/refetch interruption-only tests after shared lifecycle coverage is green.
- [ ] Retain import profile parsing/output and refetch diff/pending-persistence tests.
- [ ] Add workflow regressions proving invalid/duplicate imports and missing/unowned refetch accounts do not reserve or scrape.
- [ ] For both workflows, prove malformed profile HTML fails only after successful accounting.
- [ ] For refetch and batch import, prove pending-preview persistence failure does not rewrite successful scrape accounting.
- [ ] Retain the batch-import test to verify its indirect use of the module and per-line results.

No new test seam at the module itself: workflow tests should exercise the real shared operation with controlled client/accounting adapters.

### 5. Verify and review the complete change

- [ ] Run the focused tests, then the complete API unit suite and API type check.
- [ ] Run `pnpm check`; use `pnpm fix` only for task-owned fixes, without rewriting unrelated working-tree changes.
- [ ] Run existing real-PostgreSQL Firecrawl budget/concurrency and import/refetch integration coverage using the repository's guarded test database, after explicit approval for database-resetting work.
- [ ] Retain accounting adapter and Firecrawl adapter tests. Module tests do not replace persistence/transport evidence.
- [ ] Confirm the forum caller still compiles and its adapter tests pass unchanged.
- [ ] Inspect the final diff for public contract changes, altered error tags, retry additions, raw-data logging, changed timestamp semantics, and expanded cancellation scope.

Unit/type/lint commands from the repository root:

```sh
pnpm --filter @tepirek-revamped/api test src/services/squad-builder/firecrawl-scrape-request.test.ts src/services/squad-builder/account-import/preview-margonem-profile-import.effect.test.ts src/services/squad-builder/account-import/preview-owned-account-imports-service.test.ts src/services/squad-builder/account-refetch/preview-account-refetch-service.test.ts
pnpm --filter @tepirek-revamped/api test
pnpm --filter @tepirek-revamped/api check-types
pnpm check
```

Integration targets to run through the existing guarded integration configuration:

- `packages/api/src/services/squad-builder/squad-groups/drizzle-account-sharing-firecrawl.integration.test.ts`
- `packages/api/src/services/squad-builder/squad-groups/drizzle-account-import-refetch.integration.test.ts`

## Expected file changes

| File | Change |
| --- | --- |
| `packages/api/src/services/squad-builder/firecrawl-scrape-request.ts` | New shared lifecycle operation and documented types. |
| `packages/api/src/services/squad-builder/firecrawl-scrape-request.test.ts` | New interface-level lifecycle suite. |
| `packages/api/src/services/squad-builder/account-import/preview-margonem-profile-import-service.ts` | Replace duplicated lifecycle with one call. |
| `packages/api/src/services/squad-builder/account-refetch/preview-account-refetch-service.ts` | Replace duplicated lifecycle with one call. |
| `packages/api/src/services/squad-builder/account-import/preview-margonem-profile-import.effect.test.ts` | Retain/extend workflow behavior; relocate lifecycle-only assertions. |
| `packages/api/src/services/squad-builder/account-refetch/preview-account-refetch-service.test.ts` | Retain/extend workflow behavior; relocate lifecycle-only assertions. |
| `packages/api/src/services/squad-builder/account-import/preview-owned-account-imports-service.test.ts` | Retain batch integration with the real operation; cover downstream persistence failure. |

The accounting contract/Drizzle adapter, raw Firecrawl client/configuration, runtime composition, protocol, and database schema should not need changes.

## Acceptance criteria

- Both previews share one lifecycle implementation; neither directly coordinates reservation and finalization anymore.
- Callers learn only profile/actor input and accounted HTML/credits output.
- Parsing and pending-preview behavior remain workflow-owned and unchanged.
- Budget inputs, error precedence, metadata defaults, timestamps, and characterized cancellation behavior are preserved.
- Lifecycle assertions live primarily at the shared module's interface; workflow-specific outcomes remain covered.
- No paid requests or live-system mutations are needed to verify the refactor.
- Any unverified database or cancellation claim is reported as blocked, not marked complete.

## Planning evidence

Source inspection confirmed the duplication and the distinct forum caller. The existing focused unit baseline was run: **3 test files, 5 tests passed**. No implementation changes, real Firecrawl requests, or integration database resets were performed while preparing this plan.

## Implementation verification

- Re-ran the original baseline: 3 files, 5 tests passed before production changes.
- Added preview-interface characterization before extraction: accounting failure precedence, successful accounting before invalid HTML parsing, and gated pending-completion cancellation with successful/failed cleanup. All 5 characterization tests passed.
- Extracted `scrapeProfile` and switched both previews; lifecycle coverage now lives in its 20-test suite. Retained workflow output/diff tests and added preflight, invalid HTML, and downstream pending-persistence regressions.
- Cancellation baseline and extracted behavior agree: pending completion exits with an interrupt reason; failed cleanup adds a typed persistence failure reason after interruption. Cleanup does not turn cancellation into success. Reservation handoff cancellation, durable finalization, and process-crash recovery remain unproven, unchanged semantics.
- Complete API unit suite: 49 files, 246 tests passed, including unchanged Firecrawl transport and forum adapter tests. API type check and `pnpm check` passed.
- Real-PostgreSQL budget/concurrency and import/refetch integration targets remain **blocked pending explicit approval for database-resetting work**; unit coverage does not establish those persistence claims.
- No live Firecrawl requests, database resets, schema/HTTP/runtime-composition changes, retries, or raw-data logging were introduced. Existing frontend changes were left untouched. The working tree already contains unrelated frontend changes; leave them untouched.

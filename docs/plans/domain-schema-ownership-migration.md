# Domain Schema Ownership Migration Plan

## Goal

Adopt the schema ownership model used by Overseer without moving every Effect
Schema into `domain/`.

The migration will make `packages/api/src/domain/**` the canonical owner of
intrinsic business values, identities, invariants, and pure domain models.
Protocol, persistence, provider, startup, and UI schemas will remain at their
respective seams and compose domain schemas where their meaning is identical.

The intended dependency direction is:

```text
apps/web ───────────────┐
                       v
protocol -> services -> domain
    ^          ^          ^
    |          |          |
 server     adapters -----┘
                  ^
                  |
             packages/db
```

More precisely:

- `domain/` must not import protocol, services, adapters, server, Drizzle,
  Hono, React, or provider SDKs.
- `protocol/` may compose domain schemas but owns HTTP encoding and endpoint
  shapes.
- `services/` own use-case inputs, operation policy, and internal results.
- `adapters/` translate database and provider values into domain/service
  values.
- `apps/web` may consume exported protocol and domain schemas but owns form and
  interaction-state validation.
- `packages/db` continues to own Drizzle table schemas and migrations.

## Source model

This plan follows Overseer's documented split rather than the stronger and
incorrect rule that all schemas belong in the domain:

- `domain/`: intrinsic meaning, identities, invariants, and pure construction
- `contract/`: wire schemas and public response types
- `application/`: operation policy and application-owned interfaces
- adapters: transport, persistence, and provider translation

Reference:

- <https://github.com/dmmulroy/overseer/blob/2ff97ab86e7b0535ddc6f7731b6718e597ebdae6/src/README.md>
- <https://github.com/dmmulroy/overseer/blob/2ff97ab86e7b0535ddc6f7731b6718e597ebdae6/src/domain/README.md>
- <https://github.com/dmmulroy/overseer/blob/2ff97ab86e7b0535ddc6f7731b6718e597ebdae6/src/contract/README.md>

## Non-goals

- Do not move every `Schema.*` declaration into `domain/`.
- Do not merge `protocol/`, `services/`, or `packages/db` into the domain.
- Do not make HTTP response projections authoritative domain entities merely
  to share their TypeScript types.
- Do not make partial or localized form state part of the domain.
- Do not change public endpoint paths, payload encoding, response encoding, or
  user-visible validation behavior as part of this migration.
- Do not add a compatibility layer, schema registry, broad barrel file, or new
  package unless an observed dependency problem requires one.
- Do not refactor unrelated business logic while moving schema ownership.

## Ownership decision table

Use this table for every schema encountered during the migration.

| Question                                                                                                       | Owner                                       |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Is the value invalid regardless of whether it came from HTTP, PostgreSQL, a form, or a provider?               | `packages/api/src/domain/**`                |
| Is it a stable domain identity, value object, entity, snapshot, or domain error?                               | `packages/api/src/domain/**`                |
| Does its shape exist because of an HTTP endpoint, query, path, header, error document, or response projection? | `packages/api/src/protocol/**`              |
| Does it exist only for one use case's input, output, decision, or typed failure?                               | `packages/api/src/services/**`              |
| Does it decode a database row, configuration source, or provider response?                                     | The relevant adapter or executable boundary |
| Does it represent partial form state, localized feedback, or UI-only transformation?                           | `apps/web/src/**`                           |
| Does it describe a PostgreSQL table, relation, index, or migration?                                            | `packages/db/**`                            |

When a protocol field and domain value have exactly the same meaning, the
protocol schema must reuse the domain schema. When encoded names, optionality,
serialization, or semantics differ, keep a separate protocol schema and map
explicitly.

## Current baseline

At the time this plan was written, files containing `Schema.*` calls were
spread across these areas:

- 28 files in `packages/api/src/domain`
- 24 files in `packages/api/src/protocol`
- 8 files in `packages/api/src/services`
- 16 files in `packages/api/src/adapters`
- 40 files in `apps/web/src`

These counts are an inventory aid, not a target. Schemas are expected to remain
outside the domain when their semantic owner is outside the domain.

## Step-by-step implementation

### Step 1: Record the migration baseline

- [ ] Record the current branch and working-tree state without modifying or
      discarding existing work.
- [ ] Run the existing checks:

```sh
pnpm -F @tepirek-revamped/api test
pnpm -F @tepirek-revamped/api check-types
pnpm -F web test
pnpm -F web check-types
pnpm check
pnpm check:unused
```

- [ ] Record pre-existing failures separately from migration failures.
- [ ] Capture the current HTTP contract/OpenAPI test results so schema movement
      cannot silently change the public contract.

**Done when:** the starting behavior and known failures are documented.

### Step 2: Inventory schemas by semantic owner

Generate a working inventory with paths and exported schema names:

```sh
rg -n 'Schema\.' packages/api/src/domain packages/api/src/protocol \
  packages/api/src/services packages/api/src/adapters apps/web/src \
  --glob '*.ts' --glob '*.tsx'
```

For each schema, classify it as one of:

1. domain identity or value object;
2. domain entity, snapshot, or reusable domain variant;
3. expected domain failure;
4. protocol request, response, error, or encoding transformation;
5. use-case-local input, result, decision, or error;
6. persistence/provider/config decoder;
7. UI form or interaction schema.

Record duplicate constraints, especially raw `Schema.String`, `Schema.Finite`,
and date fields in protocol modules that correspond to an existing branded or
refined domain value.

Prioritize the Squad Builder slice because it already has domain IDs, names,
visibility, professions, snapshots, and protocol schemas that can demonstrate
the complete ownership model.

**Done when:** every candidate in the pilot slice has an explicit owner and no
move is justified only by the word `Schema` in its name.

### Step 3: Record the architecture decision

- [ ] Add an ADR under `docs/adr/` documenting schema ownership and dependency
      direction.
- [ ] Update `CONTEXT.md` only where its architecture vocabulary needs to state
      that domain schemas own intrinsic invariants while protocol schemas own
      wire contracts.
- [ ] Add `packages/api/src/domain/README.md` with concise domain rules:
  - no I/O or framework imports;
  - no protocol, service, adapter, or server imports;
  - accept time, randomness, and external values as inputs;
  - decode less-trusted values before they enter inner code;
  - preserve domain vocabulary from `CONTEXT.md`;
  - use brands where mixing primitives is a realistic error.
- [ ] Add a matching short ownership note to `packages/api/src/protocol/` if
      needed, stating that protocol modules compose domain schemas but own wire
      representation.

**Done when:** future schema placement can be decided from repository
documentation without referring to Overseer.

### Step 4: Add a dependency-direction guard

- [ ] Verify whether the existing Oxlint setup can express restricted imports.
- [ ] If supported, configure the narrowest rule that prevents
      `packages/api/src/domain/**` from importing protocol, services, adapters,
      server, Drizzle, Hono, React, or provider SDK modules.
- [ ] If the current linter cannot enforce this cleanly, add one focused
      architecture test using existing dependencies rather than introducing a
      new architecture framework.
- [ ] Keep allowed Effect imports explicit: Effect Schema, data structures,
      and pure utilities are permitted; runtime infrastructure modules are not.
- [ ] Add a failing fixture or focused assertion proving that an outward import
      would be detected.

**Done when:** dependency direction is mechanically protected rather than only
written in documentation.

### Step 5: Normalize the domain module interface

Apply the repository's established Effect v4 conventions to domain models:

```ts
export const SquadGroupName = Schema.String.check(/* invariant */).pipe(
  Schema.brand("SquadGroupName")
);
export type SquadGroupName = typeof SquadGroupName.Type;

export const MargonemCharacterPreview = Schema.Struct({
  // domain fields
});
export interface MargonemCharacterPreview extends Schema.Schema.Type<
  typeof MargonemCharacterPreview
> {}
```

- [ ] Prefer the same exported name for a runtime schema and its TypeScript
      type/interface.
- [ ] Remove `Schema` suffixes from domain names when the suffix only exposes an
      implementation detail, for example evaluate:
  - `MargonemProfessionSchema` -> `MargonemProfession`
  - `MargonemCharacterPreviewSchema` -> `MargonemCharacterPreview`
  - `SquadGroupVisibilitySchema` -> `SquadGroupVisibility`
- [ ] Keep temporary aliases only if an atomic rename is impractical; remove
      them within the same feature-slice migration rather than maintaining a
      compatibility surface.
- [ ] Use `Schema.Struct` plus a same-name interface for ordinary records.
- [ ] Use constrained branded schemas for scalar identities and value objects.
- [ ] Use `Schema.TaggedErrorClass` for expected typed failures that cross
      Effect interfaces.
- [ ] Use `Data.TaggedEnum` for internal service decisions that do not need
      decoding, persistence, transport, or schema derivation.
- [ ] Do not introduce `Schema.Class` or `Schema.TaggedClass` as the default
      domain modeling style.
- [ ] Annotate schemas only where HTTP/OpenAPI or other tooling consumes the
      annotation.

**Done when:** domain callers use domain language rather than distinguishing a
schema export from a separately maintained type export.

### Step 6: Complete the Squad Builder domain primitives

Audit and consolidate canonical constraints in
`packages/api/src/domain/squad-builder/`.

- [ ] Confirm one canonical schema exists for each ID:
  - `AppUserId`
  - `MargonemAccountId`
  - `MargonemAccountAccessId`
  - `MargonemProfileId`
  - `MargonemCharacterId`
  - `PendingMargonemAccountImportId`
  - `PendingMargonemAccountRefetchId`
  - `SquadGroupId`
  - `SquadGroupInvitationId`
  - `SquadId`
- [ ] Confirm one canonical schema exists for constrained domain values:
  - account display name;
  - squad and squad-group names;
  - positive integers and positive levels;
  - squad and character positions;
  - Margonem world and profession;
  - squad-group visibility and invitation/access status;
  - Firecrawl year/month values.
- [ ] Move a constraint into the domain only when it is intrinsic. Leave batch
      sizes, HTTP field presence, and endpoint-specific optionality with the
      owning use case or protocol.
- [ ] Ensure trusted constructors use `.make(...)` and untrusted values use
      `Schema.decodeUnknownEffect(...)` or `makeEffect(...)`.
- [ ] Expand focused domain tests for lower/upper bounds, brands,
      transformations, and invalid values.

**Done when:** Squad Builder has one canonical definition for every intrinsic
value used across protocol, services, adapters, and the web client.

### Step 7: Compose domain values into Squad Builder protocol schemas

Update schemas under `packages/api/src/protocol/squad-builder/**` without
moving endpoint DTOs into the domain.

Start with `squad-groups/squad-groups-schema.ts`:

- [ ] Replace raw squad-group name fields with the canonical domain
      `SquadGroupName` where the API and domain meanings are identical.
- [ ] Replace raw squad names with `SquadName` where appropriate.
- [ ] Replace raw positions with `SquadPosition` and `CharacterPosition` only
      after confirming their encoded HTTP representation remains unchanged.
- [ ] Reuse `MargonemWorld`, `MargonemProfession`, IDs, visibility, and status
      schemas instead of restating their literals or primitive constraints.
- [ ] Keep `CreateSquadGroupPayload`, `SaveSquadGroupPayload`,
      `SquadGroupSummarySchema`, and other endpoint-shaped objects in
      `protocol/`.
- [ ] Keep UI/read projections such as global summaries in `protocol/` unless
      services independently require the exact same stable domain model.

Continue through:

- [ ] `account-import/account-import-schema.ts`
- [ ] `account-refetch/account-refetch-schema.ts`
- [ ] `account-sharing/account-sharing-schema.ts`
- [ ] `squad-group-sharing/squad-group-sharing-schema.ts`

For every change:

- [ ] Compare encoded and decoded types before substituting a domain schema.
- [ ] Preserve `optionalKey`, nullability, date serialization, and field names.
- [ ] Use `.fields` for genuinely related contracts rather than copying field
      definitions.
- [ ] Keep explicit mapping where protocol names or semantics differ.
- [ ] Verify the affected `HttpApi` contract and route tests.

**Done when:** Squad Builder protocol schemas describe transport shapes by
composing canonical domain values instead of duplicating domain invariants.

### Step 8: Separate service models from wire models

Audit `packages/api/src/services/squad-builder/**` for protocol types imported
as use-case inputs or outputs.

- [ ] Give each use case an application-owned input and result when its
      interface is not itself a domain concept.
- [ ] Pass parsed domain IDs and values into services rather than raw HTTP
      strings/numbers.
- [ ] Keep operation policy such as batch size, concurrency, expiration, and
      retry behavior beside the use case that owns it.
- [ ] Keep internal decisions such as
      `PreviewOwnedAccountImportItem` as `Data.TaggedEnum` unless they cross a
      decoding, persistence, or transport seam.
- [ ] Avoid importing protocol payload or response types into services.
- [ ] Map service results to protocol responses in handlers or dedicated pure
      mapper functions.
- [ ] Do not create duplicate Schema models solely so internal data can use
      tagged constructors or matching helpers.

For `preview-owned-account-imports-service.ts` specifically:

- [ ] Preserve the use-case-owned batch and expiration policies.
- [ ] Preserve the internal tagged result model.
- [ ] Keep the protocol's serialized success/error union separate and map it
      explicitly at the server seam.

**Done when:** services can be called without knowledge of HTTP payloads or
response serialization.

### Step 9: Decode values in adapters

Audit Squad Builder adapters under
`packages/api/src/adapters/squad-builder/**`.

- [ ] Decode database IDs, statuses, worlds, professions, timestamps, and
      constrained values before returning domain/service models.
- [ ] Decode Firecrawl responses at the Firecrawl adapter seam before passing
      values to inner code.
- [ ] Map decode failures to the narrow typed adapter/service failure that can
      truthfully describe the problem.
- [ ] Keep database column names, nullable row shapes, JSON storage formats,
      and provider-specific schemas in adapters or `packages/db`.
- [ ] Do not reuse a domain entity directly as a persisted row schema when the
      row has different nullability, naming, joins, or lifecycle semantics.
- [ ] Add adapter tests for malformed persisted/provider values so invalid raw
      data cannot cross inward.

**Done when:** service and domain code do not receive unchecked database rows
or provider payloads.

### Step 10: Preserve UI-owned form schemas

Audit `apps/web/src/features/squad-builder/**` after protocol composition is
complete.

- [ ] Keep `ProfileUrlsSchema` in the web feature because it models multiline
      form text, localized messages, and a UI transformation into an array.
- [ ] Continue deriving its decoded target from the canonical protocol/domain
      field where appropriate.
- [ ] Keep partial drafts, filters, confirmation state, and localized form
      feedback in the web app.
- [ ] Reuse exported domain value schemas for complete values whose invariant
      is identical across UI and server.
- [ ] Do not expose server-only adapter or service modules to make a form import
      convenient.
- [ ] Verify browser bundling after every new domain import.

**Done when:** the web client shares canonical business invariants without
forcing UI interaction state into the domain.

### Step 11: Verify package exports

Review `packages/api/package.json` after the pilot migration.

- [ ] Keep browser-safe domain exports explicit and feature-scoped.
- [ ] Add exports only for domain modules genuinely consumed outside the API
      package.
- [ ] Keep server-only exports marked with `"browser": null`.
- [ ] Avoid a domain barrel file that re-exports every internal model.
- [ ] Confirm renamed domain modules do not leave stale wildcard import paths.
- [ ] Run the web build to prove no server-only dependency enters the browser
      graph.

**Done when:** consumers can import stable domain modules without exposing the
entire API package implementation.

### Step 12: Migrate remaining feature slices incrementally

After Squad Builder proves the pattern, repeat Steps 2 and 5-11 one vertical
slice at a time:

- [ ] Hero bet ledger, ranking, and vault
- [ ] Events and heroes
- [ ] Auctions
- [ ] Skills
- [ ] Announcements
- [ ] Todos
- [ ] User/auth-facing domain values
- [ ] Health and executable configuration only where intrinsic domain values
      actually exist

For each slice:

1. classify schemas by semantic owner;
2. establish canonical domain values;
3. compose them into protocol contracts;
4. remove protocol dependencies from services;
5. decode values in adapters;
6. preserve UI-only form schemas;
7. verify tests, types, contract behavior, and browser bundling;
8. remove obsolete duplicate definitions before starting the next slice.

Do not create a domain entity merely because an endpoint returns a similarly
shaped database projection. Read models may remain protocol- or service-owned.

**Done when:** every feature follows the same ownership rule and no duplicate
intrinsic constraint remains.

### Step 13: Remove migration leftovers

- [ ] Search for old domain names ending in `Schema` that were renamed.
- [ ] Remove temporary aliases and duplicate schema/type declarations.
- [ ] Search protocol modules for raw primitives that should now compose a
      domain value.
- [ ] Search services for protocol imports.
- [ ] Search domain modules for outward imports.
- [ ] Remove unused exports reported by Knip.
- [ ] Format only the files touched by the migration.

Suggested searches:

```sh
rg 'Schema$|Schema\b' packages/api/src/domain --glob '*.ts'
rg 'from .*protocol' packages/api/src/services packages/api/src/domain --glob '*.ts'
rg 'from .*services|from .*adapters|from .*server' packages/api/src/domain --glob '*.ts'
rg 'Schema\.(String|Number|Finite)' packages/api/src/protocol --glob '*.ts'
```

Each raw primitive found by the final search requires review, not automatic
replacement; many are legitimate protocol-only fields.

**Done when:** there are no compatibility aliases, duplicate intrinsic
constraints, invalid dependencies, or unused migration exports.

### Step 14: Final verification

Run:

```sh
pnpm -F @tepirek-revamped/api test
pnpm -F @tepirek-revamped/api check-types
pnpm -F web test
pnpm -F web check-types
pnpm test:integration
pnpm check
pnpm check:unused
pnpm build
```

Also verify:

- [ ] OpenAPI generation and HTTP contract tests show no unintended wire
      changes.
- [ ] Database integration tests prove persisted values are decoded.
- [ ] Representative Squad Builder browser flows still submit and display the
      same values and errors.
- [ ] Browser builds contain no server-only modules.
- [ ] Domain tests cover intrinsic constraints independently of HTTP.
- [ ] The architecture guard rejects outward domain imports.

**Done when:** all checks pass, any intentional contract change is separately
reviewed, and runtime behavior is preserved.

## Pilot completion criteria

The Squad Builder pilot is complete when:

1. Every intrinsic Squad Builder value has one canonical domain schema.
2. Protocol schemas compose those values without becoming domain modules.
3. Services do not depend on protocol request or response types.
4. Adapters decode untrusted persisted and provider values before returning
   them inward.
5. Form-only schemas remain in the web app and retain localized interaction
   behavior.
6. Domain modules have no outward architecture dependencies.
7. Existing unit, integration, contract, type, lint, unused-code, and build
   checks pass.

## Repository-wide completion criteria

The migration is complete when:

1. Schema location follows semantic ownership rather than technical type.
2. Domain invariants have one source of truth.
3. Wire encoding, persistence shape, use-case policy, and UI state remain owned
   by their respective modules.
4. All inward seams decode less-trusted values.
5. Dependency direction is documented and mechanically enforced.
6. No migration compatibility code or duplicate intrinsic schema remains.
7. Public HTTP and user-visible behavior remain unchanged unless a separate
   change explicitly updates them.

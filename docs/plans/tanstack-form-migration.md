# TanStack Form Migration Plan

## Goal

Replace all uses of `@lucas-barake/effect-form` and
`@lucas-barake/effect-form-react` in `apps/web` with TanStack Form while
continuing to use Effect Schema as the source of validation rules and decoded
submission types.

The migration must preserve the current user-visible behavior:

- validation timing (`onSubmit` or `onChange`)
- Effect Schema error messages and field paths
- Effect Schema transformations before mutations run
- pending, success, and failure behavior
- draft retention after failed submissions
- reset and prop-driven default-value behavior
- modal close protection while a submission is pending
- accessible labels, errors, summaries, and focus management

## Current scope

The web app currently has 21 Effect Form instances in 19 source files:

- `apps/web/src/components/login-form.tsx`
- `apps/web/src/components/signup-form.tsx`
- `apps/web/src/routes/dashboard/-components/tasks-page.tsx`
- `apps/web/src/routes/dashboard/-components/add-announcement-modal.tsx`
- `apps/web/src/routes/dashboard/-components/edit-profile-modal.tsx`
- `apps/web/src/routes/dashboard/skills/-components/add-profession-modal.tsx`
- `apps/web/src/routes/dashboard/skills/-components/add-range-modal.tsx`
- `apps/web/src/routes/dashboard/skills/$rangeName/-components/add-skill-modal.tsx`
- `apps/web/src/routes/dashboard/calculator/-components/list-page.tsx` (two forms)
- `apps/web/src/routes/dashboard/calculator/-components/odw-page.tsx`
- `apps/web/src/routes/dashboard/calculator/-components/ulepa-page.tsx`
- `apps/web/src/routes/dashboard/events/-components/bets-add-page.tsx`
- `apps/web/src/routes/dashboard/events/-components/heroes/add-hero-modal.tsx`
- `apps/web/src/routes/dashboard/events/-components/history/edit-bet-modal.tsx`
- `apps/web/src/routes/dashboard/events/-components/list/add-event-modal.tsx`
- `apps/web/src/routes/dashboard/events/-components/ranking/distribute-gold-modal.tsx`
- `apps/web/src/routes/dashboard/squad-builder/-components/accounts/account-import-frame.tsx` (two forms)
- `apps/web/src/routes/dashboard/squad-builder/-components/accounts/owned-accounts-grid.tsx`
- `apps/web/src/routes/dashboard/squad-builder/-components/squads/squad-group-library.tsx`

## Implementation status

This migration is being completed incrementally. The current increment includes
TanStack Form installation, the shared form seam, application submission
adapters, the complete production-form migration, and the lifecycle test and
cleanup work.

### Completed in this increment

- Step 1 baseline recorded: web tests and type checks passed; `pnpm check` was
  blocked only by the pre-existing formatting issue in this untracked plan.
- Step 2 completed: `@tanstack/react-form@1.33.4` is installed and the lockfile
  was updated by pnpm.
- Step 3 completed: shared contexts, `useAppForm`, registered shared fields,
  and a production-seam test form are present.
- Step 6 completed: TanStack-compatible result adapters and tests for success,
  typed failures, safe messages, and non-Error defects are present.
- Step 7 completed: login, Add hero, and Odwiązanie are migrated with complete
  schemas, decoded submissions, TanStack pending/on-change state, mutation
  feedback, modal close protection, and local calculator results.
- Step 8 completed: all simple CRUD forms now own values, validation, pending
  state, decoded submissions, failure feedback, and success-only reset through
  TanStack.
- Step 9 completed: all calculator forms now use local TanStack state, complete
  Effect schemas, on-change validation, decoded values, and local results.
- Step 10 completed: all event forms now use TanStack field state, complete
  schemas, decoded submissions, local feedback, dependent previews, and pending
  close protection.
- Step 11 completed: account import preview and confirmation rows, account
  rename, squad-group creation, and squad-group filters now use TanStack form
  state, complete schemas, decoded submissions, local feedback, and cross-field
  validation.
- Signup is also migrated; all production forms and tests now use the new
  seam.
- Step 12 is complete: production-seam tests now cover invalid-control focus
  and replacement of stale values when default props change.
- Step 13 is complete: the legacy modules, tests, dependencies, lockfile
  entries, and workspace override are removed.
- Form submission state now uses the typed Effect `FormSubmissionError` and
  `AuthFormSubmissionError` classes; generic `unknown` failure state was
  removed from production forms and `FormFeedback`.

### Still in progress or not started

- Step 14 is in progress; automated verification is complete. Manual browser
  verification is blocked because the local API cannot start without PostgreSQL
  on `127.0.0.1:5432`.

### Verification for this increment

- [x] `pnpm -F web test` — 211 tests passed.
- [x] `pnpm -F web check-types` — passed.
- [x] `pnpm check` — passed.
- [x] `pnpm -F web build` — passed.
- [x] `pnpm check:unused` — passed after removing three unused type exports.
- [x] Focused seam verification: `pnpm -F web test` — 211 tests passed;
      `pnpm -F web check-types` — passed; `pnpm dlx ultracite fix` — passed.

## Key technical decisions

### Use complete Effect schemas

Each form will have one `Schema.Struct` describing its complete encoded form
state. Existing reusable field schemas remain the source of individual field
rules.

```ts
const LoginFormSchema = Schema.Struct({
  email: EmailSchema,
  password: PasswordSchema,
});

const LoginFormValidator = Schema.toStandardSchemaV1(LoginFormSchema);
```

The project-pinned Effect v4 API is `Schema.toStandardSchemaV1`. Do not use the
Effect v3 documentation name `Schema.standardSchemaV1`.

### Validate at form level

Pass the Standard Schema adapter to the TanStack form validator matching the
form's existing validation mode:

- existing `onSubmit` forms use `validators.onSubmit`
- existing calculator `onChange` forms use `validators.onChange`

Form-level validation is required so Effect issue paths are routed to the
matching TanStack fields.

### Decode again before submission

TanStack Form validates Standard Schemas but passes the original encoded input
to `onSubmit`. It does not retain the schema's transformed output.

Every submit handler must therefore run the same Standard Schema validator
again and use its successful `value` before calling application code. Await the
validator result so both synchronous and asynchronous Effect schemas are
supported. If the second validation returns issues, do not call the mutation;
the form-level validator remains responsible for displaying those issues.

This is required for existing transformations such as:

- event, hero, and profession IDs from `string` to `number`
- profile URL text from `string` to a non-empty array of trimmed lines
- nullable event dates to required `Date` values
- ordinary arrays to non-empty arrays

### Do not emulate Effect Form

Do not introduce a compatibility implementation of `FormBuilder`,
`FormReact.make`, generated field components, atoms, or `AsyncResult`. Use
TanStack Form's native APIs:

- `useAppForm`
- `form.AppField` for shared bound fields
- `form.Field` for specialized fields
- `form.Subscribe` for render-only subscriptions
- `useSelector` for values needed by component logic
- `form.handleSubmit`, `form.reset`, and `form.setFieldValue`

### Keep submission failures separate from validation failures

TanStack Form owns field validation and pending state. Application mutation
failures need a small application-owned submission result abstraction because
TanStack Form does not expose arbitrary `onSubmit` return values as form state.

The abstraction must:

- clear the previous mutation failure when a new submission starts
- execute the existing typed Effect submission or promise mutation
- retain a safe typed failure for persistent feedback
- return success/failure as a value so callers only reset, close, or toast on
  success
- preserve defects as defects rather than presenting arbitrary thrown values
- avoid duplicating Effect Schema field failures in the form-level feedback
- keep persistent component failure state typed as the concrete Effect error
  classes rather than `unknown`

Adapt `apps/web/src/lib/form-submission.ts` and
`apps/web/src/lib/auth-form-behavior.ts` at this boundary instead of spreading
`try/catch` and error-message conversion through every form.

## Step-by-step implementation

### Step 1: Record the baseline

- [x] Run `pnpm -F web test` — 213 tests passed.
- [x] Run `pnpm -F web check-types` — passed.
- [x] Run `pnpm check` — failed only because this plan had pre-existing
      formatting issues.
- [x] Record the pre-existing checks before changing dependencies or code.

**Done when:** the starting state is known and migration failures can be
distinguished from existing failures.

### Step 2: Add TanStack Form

- [x] Add `@tanstack/react-form` to `apps/web/package.json` using the current
      compatible release.
- [x] Update `pnpm-lock.yaml` through pnpm rather than editing it manually.
- [x] Keep both Effect Form packages temporarily while forms are migrated.
- [x] Confirm React 19 satisfies TanStack Form's peer dependency.

**Done when:** `apps/web` type-checks with TanStack Form installed and no forms
have changed behavior yet.

### Step 3: Create the shared TanStack form context

**Status: complete.**

Create the following modules:

- [x] `apps/web/src/components/forms/form-context.ts`
  - create contexts with `createFormHookContexts`
  - export the shared field and form context hooks
- [x] `apps/web/src/components/forms/app-form.ts`
  - create `useAppForm` with `createFormHook`
  - register only the shared field components used throughout the app

Use the same field context instance in every registered component. Avoid
barrel files and avoid exposing untyped form context as a general escape hatch.

**Done when:** a small test form can create an app form and render a bound field
with inferred field names and values. Covered by
`apps/web/src/components/forms/app-form.test.tsx`.

### Step 4: Port the shared field UI

**Status: complete.** Neutral TanStack-backed fields are implemented,
registered, and used by every production form and the production-seam tests.

Replace the Effect-specific implementations in:

- `apps/web/src/components/forms/effect-form-field-helpers.tsx`
- `apps/web/src/components/forms/effect-form-fields.tsx`

with neutral TanStack-backed modules, for example:

- `apps/web/src/components/forms/form-field-helpers.tsx`
- `apps/web/src/components/forms/form-fields.tsx`

Port and rename:

- [x] `EffectFieldError` to `FormFieldError`
- [x] `EffectFieldFrame` to `FormFieldFrame`
- [x] `EffectTextField` to `TextField`
- [x] `EffectNumberField` to `NumberField`
- [x] `EffectTextareaField` to `TextareaField`
- [x] `EffectCheckboxField` to `CheckboxField`
- [x] `EffectStringSelectField` to `StringSelectField`

Each bound component must use the shared `useFieldContext` and map TanStack
state as follows:

- `field.name` for the DOM name and stable ID
- `field.state.value` for the controlled value
- `field.handleChange` for updates
- `field.handleBlur` for touched state
- `field.state.meta.errors` for Effect Standard Schema issues
- `field.state.meta.isValid` and submission/touched state for ARIA errors

Centralize extraction of a localized message from a Standard Schema issue.
Preserve:

- labels and `htmlFor`
- stable sanitized IDs
- helper text
- `aria-invalid`
- `aria-describedby`
- `aria-required`
- decimal number input behavior
- boolean-only checkbox updates

**Done when:** all shared field rendering tests pass against TanStack field
context without importing Effect Form.

### Step 5: Port the form shell and feedback

**Status: complete.** The neutral shell is used by every production form and
its behavior is covered by the production-seam tests.

Replace `apps/web/src/components/forms/effect-form.tsx` with a neutral form
shell.

- [x] Render a native `<form noValidate>`.
- [x] Prevent the browser submit event and call `form.handleSubmit()`.
- [x] Preserve caller `onSubmit` behavior where needed.
- [x] Subscribe only to the TanStack state needed by the shell.
- [x] On an invalid submission attempt, find controls with
      `aria-invalid="true"` and focus the first one.
- [x] Preserve the error-summary threshold of three invalid controls.
- [x] Preserve summary links that focus their associated controls.
- [x] Render mutation feedback separately from field validation feedback.
- [x] Replace `useCanCloseForm` with a neutral helper driven by TanStack
      `isSubmitting`.

Do not make the form shell responsible for decoding or business mutations.

**Done when:** native validation is disabled, invalid controls are summarized,
and mutation failures render once without duplicating field errors.

### Step 6: Adapt submission handling

**Status: complete.** The result adapters are used by the migrated forms and
covered by focused tests.

- [x] Change the form submission boundary so TanStack submit handlers can await
      it without depending on Effect Form atoms or `AsyncResult`.
- [x] Preserve `FormSubmissionError` and `AuthFormSubmissionError` safe messages.
- [x] Preserve auth provider response classification.
- [x] Preserve login success order: toast, router invalidation, navigation.
- [x] Preserve signup success order: navigation, toast.
- [x] Remove `submitWhenIdle` after TanStack's `isSubmitting` guard replaces all
      callers.
- [x] Add tests for success, typed failure, defect behavior, and safe error
      projection.

**Done when:** a TanStack `onSubmit` can distinguish validation failure,
mutation failure, and success without thrown expected failures leaking into
components.

### Step 7: Migrate a representative pilot

**Status: complete for this increment.** Login, Add hero, and Odwiązanie are
migrated.

Migrate three forms before changing the remaining files:

#### Login form

- [x] Define `LoginFormSchema` with email and password fields.
- [x] Use `Schema.toStandardSchemaV1(LoginFormSchema)` on submit.
- [x] Use `useAppForm` inside `LoginForm`.
- [x] Replace generated fields with `form.AppField` and bound text fields.
- [x] Subscribe to `isSubmitting` for button state and label.
- [x] Display auth mutation failure through the new feedback abstraction.

#### Add hero form

- [x] Define one struct schema for name, image, level, and event ID.
- [x] Decode the submission so the mutation receives `eventId: number`, not the
      encoded string.
- [x] Port text, number, and select controls.
- [x] Preserve reset, toast, modal close, loading state, and failed draft.

#### Odwiązanie calculator

- [x] Define one struct schema for item level and rarity.
- [x] Use `validators.onChange` to preserve current validation timing.
- [x] Store the calculated output in component state because TanStack does not
      retain the `onSubmit` return value.
- [x] Port the custom rarity selector with `form.Field`.

Run focused tests and type checks before continuing.

**Done when:** the pilot proves async mutation feedback, transformed decoding,
specialized fields, and on-change validation. Complete for this increment.

### Step 8: Migrate simple CRUD forms

Migrate these forms one at a time:

- [x] `tasks-page.tsx`
  - reset only after successful creation
  - keep failed task text
  - clear the previous failure on a new attempt
- [x] `add-announcement-modal.tsx`
- [x] `edit-profile-modal.tsx`
  - explicitly reset when `defaultName` changes
- [x] `add-profession-modal.tsx`
- [x] `add-range-modal.tsx`
- [x] `add-skill-modal.tsx`
  - decode `professionId` to `number`
  - preserve prop-driven profession defaults
  - keep dependent loading behavior

For each remaining form:

1. Define a complete Effect struct schema.
2. Create its Standard Schema validator once outside render where possible.
3. Move form construction into the component with `useAppForm`.
4. Replace generated fields with `AppField`.
5. Re-decode and use transformed output in `onSubmit`.
6. Move success effects directly into the successful submit branch.
7. Replace Effect Form state reads with narrow TanStack subscriptions.
8. Delete obsolete Effect Form imports before moving to the next form.

**Done when:** all simple CRUD forms preserve successful reset/close behavior
and failed drafts.

### Step 9: Migrate the remaining calculators

- [x] Migrate both forms in `calculator/-components/list-page.tsx`.
- [x] Migrate `calculator/-components/ulepa-page.tsx`.
- [x] Keep calculator results in local component state.
- [x] Preserve `onChange` validation mode.
- [x] Keep form state independent when switching between single and group
      modes.
- [x] Port custom rarity selectors with `form.Field` and `FormFieldFrame`.
- [x] Ensure number inputs retain decimal values rather than truncating them.

**Done when:** all four calculator forms validate and calculate without Effect
Form or `AsyncResult` submission state.

### Step 10: Migrate event forms

**Status: complete for this increment.** All four event forms use TanStack
state and complete Effect Schema validators.

#### Add bet

- [x] Define a struct schema for event ID, hero ID, and selected user IDs.
- [x] Port `EventField`, `HeroField`, and `MembersField` to TanStack field APIs.
- [x] Replace atom-based field clearing with `form.setFieldValue`.
- [x] Read `selectedEventId` with a narrow `useSelector` subscription.
- [x] Keep the Enter hotkey guarded by `isSubmitting`.
- [x] Clear selected users only after success.

#### Edit bet

- [x] Port the custom member picker field.
- [x] Explicitly reset when the current member IDs change.
- [x] Preserve the non-empty decoded tuple sent to the mutation.

#### Add event

- [x] Port icon, color, and date fields with `form.Field`.
- [x] Read the selected color through a narrow subscription for icon preview.
- [x] Preserve the date refinement from `Date | null` to `Date`.

#### Distribute gold

- [x] Port event, hero, and gold amount fields.
- [x] Replace atom field clearing with `form.setFieldValue`.
- [x] Subscribe narrowly to event, hero, and gold values used by previews.
- [x] Decode event and hero IDs to numbers before mutation.
- [x] Keep parsed gold and distribution result in explicit local logic.
- [x] Preserve hero-stat loading and submit-disable rules.

**Done when:** all specialized event controls use TanStack field APIs and their
mutations receive decoded Effect Schema output. Complete for this increment.

### Step 11: Migrate squad-builder forms

**Status: complete for this increment.** All squad-builder forms now use
TanStack state and complete Effect Schema validators.

#### Account import preview

- [x] Port `ProfileUrlsField` behavior to the TanStack textarea field.
- [x] Validate through a complete struct schema.
- [x] Use decoded trimmed profile URL lines for the preview request.
- [x] Move preview response processing into the successful submit branch.
- [x] Keep preview items and step state local.
- [x] Preserve clear/reset behavior.

#### Account confirmation rows

- [x] Create one TanStack form instance per row component.
- [x] Reset when a row is confirmed.
- [x] Preserve trimmed display names and per-row field IDs.
- [x] Keep one row's errors and pending state isolated from other rows.

#### Account rename

- [x] Port the inline rename form.
- [x] Preserve initial account display name, trim-on-submit, cancel behavior,
      and failed draft retention.

#### Squad group filters

- [x] Create a complete schema containing name, minimum level, and maximum
      level.
- [x] Move `validateSquadFilterLevelOrder` into an Effect schema refinement on
      that struct.
- [x] Preserve the issue path `maxLevel` so TanStack routes the message to the
      upper-bound field.
- [x] Decode and trim values before applying filters.
- [x] Preserve clear behavior and active-filter state.

**Done when:** the multi-stage import, repeated row forms, inline rename, and
cross-field filter validation work without Effect Form.

### Step 12: Replace lifecycle and component tests

**Status: complete.** The old lifecycle and Effect Form rendering tests were
replaced with production-seam tests, including browser-like focus management
and prop-driven default coverage.

Update or replace:

- `apps/web/src/lib/form-lifecycle.test.ts`
- `apps/web/src/components/forms/effect-form.test.tsx`
- `apps/web/src/components/forms/effect-form-fields.test.tsx`

Cover these behaviors through the production TanStack seam:

- [x] invalid values block mutation calls
- [x] the first invalid control receives focus after submission
- [x] Effect Standard Schema messages reach the correct field path
- [x] a pending mutation sets `isSubmitting`
- [x] duplicate submissions are blocked while pending
- [x] a failed mutation preserves current values
- [x] a successful mutation permits reset
- [x] explicit reset restores initial values
- [x] changed props/defaults replace stale values
- [x] transformed schema output reaches mutation functions
- [x] mutation failure feedback remains visible
- [x] schema field failures do not create duplicate form feedback
- [x] labels, IDs, `aria-invalid`, and `aria-describedby` remain connected
- [x] number fields preserve decimal input
- [x] checkboxes, textareas, and selects remain controlled

Retain `apps/web/src/lib/form-schemas.test.ts` as direct Effect Schema coverage
and extend it only where complete-form or cross-field behavior needs proof.

**Done when:** the old Effect Form lifecycle is no longer referenced by tests
and all required behavior is covered at the TanStack/application boundary.

### Step 13: Delete Effect Form code and dependencies

**Status: complete.** Every production form and test has migrated, so the
obsolete modules and dependencies have been removed.

- [x] Delete obsolete Effect-specific form components.
- [x] Delete or rename obsolete Effect-specific test files.
- [x] Remove `@lucas-barake/effect-form-react` from web dependencies.
- [x] Remove `@lucas-barake/effect-form` from web dev dependencies.
- [x] Update `pnpm-lock.yaml` with pnpm.
- [x] Search for remaining imports:

```sh
rg '@lucas-barake/effect-form|FormBuilder|FormReact|EffectForm|EffectField' apps/web
```

- [x] Remove now-unused Effect atom imports that only supported form state.
- [x] Remove obsolete comments referring to Effect Form ownership.
- [x] Run the unused-code check.

**Done when:** the search returns no migration leftovers and both Effect Form
packages are absent from the manifest and lockfile.

### Step 14: Final verification

**Status: in progress.** Automated tests, type checks, formatting checks, the
unused-code check, and build pass. Manual browser verification is blocked
because the local API cannot start without PostgreSQL on `127.0.0.1:5432`.

Run:

```sh
pnpm -F web test
pnpm -F web check-types
pnpm check
pnpm check:unused
pnpm -F web build
```

Also manually verify representative browser flows:

- [ ] invalid login and successful login
- [ ] failed and successful CRUD modal submission
- [ ] calculator validation and result updates
- [ ] bet member selection and Enter submission
- [ ] event date/icon/color validation
- [ ] gold-distribution dependent previews
- [ ] account import preview and confirmation
- [ ] account rename
- [ ] squad filter cross-field error
- [ ] keyboard focus moves to the first invalid control
- [ ] dialogs cannot close during active submissions

## Completion criteria

The migration is complete when:

1. No source or test imports either Effect Form package.
2. Every form validates with an Effect schema converted through
   `Schema.toStandardSchemaV1`.
3. Every mutation receives decoded Effect Schema output where encoded and
   decoded types differ.
4. TanStack Form owns form values, validation, touched state, reset, and
   pending state.
5. Application submission failures remain typed, safe, persistent, and
   separate from field errors.
6. Existing success, reset, modal, hotkey, and accessibility behavior is
   preserved.
7. Tests, type checks, linting, unused-code checks, and the web build pass.

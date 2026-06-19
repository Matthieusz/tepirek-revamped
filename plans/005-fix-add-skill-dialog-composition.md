# Plan 005: Fix the Add Skill dialog trigger/content composition

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat de43490..HEAD -- apps/web/src/components/modals/add-skill-modal.tsx apps/web/src/components/modals/add-hero-modal.tsx apps/web/src/components/ui/responsive-dialog.tsx apps/web/src/routes/dashboard/skills/'$rangeName'/route.tsx`
> If any in-scope file changed since this plan was written, compare the excerpts below against live code before proceeding; on mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-establish-workspace-typecheck.md`
- **Category**: bug
- **Planned at**: commit `de43490`, 2026-06-19

## Why this matters

`AddSkillModal` passes `ResponsiveDialogContent` as a `render` prop to `ResponsiveDialogTrigger`, while other modals render trigger and content as siblings. This likely makes the skill dialog fail to open or renders content in the wrong place. The fix is small and should align the component with the established modal pattern.

## Current state

Relevant files:

- `apps/web/src/components/modals/add-skill-modal.tsx` — component to fix.
- `apps/web/src/components/modals/add-hero-modal.tsx` — exemplar of correct responsive dialog composition.
- `apps/web/src/components/ui/responsive-dialog.tsx` — wrapper API for trigger/content.
- `apps/web/src/routes/dashboard/skills/$rangeName/route.tsx` — caller.

Bad current pattern:

```tsx
// apps/web/src/components/modals/add-skill-modal.tsx:92-100
return (
  <ResponsiveDialog onOpenChange={setOpen} open={open}>
    <ResponsiveDialogTrigger
      render={
        <ResponsiveDialogContent className="sm:max-w-106.25">
          <form
```

```tsx
// apps/web/src/components/modals/add-skill-modal.tsx:235-240
          </ResponsiveDialogContent>
        }
      >
        {trigger}
      </ResponsiveDialogTrigger>
```

Good existing pattern:

```tsx
// apps/web/src/components/modals/add-hero-modal.tsx:92-96
return (
  <ResponsiveDialog onOpenChange={setOpen} open={open}>
    <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
    <ResponsiveDialogContent className="sm:max-w-106.25">
      <form
```

Trigger API:

```tsx
// apps/web/src/components/ui/responsive-dialog.tsx:72-87
const ResponsiveDialogTrigger = ({ children, asChild, ...props }) => {
  const isMobile = useResponsiveDialog();
  if (isMobile) return <DrawerTrigger {...props}>{children}</DrawerTrigger>;
  if (asChild) return <DialogTrigger render={children} {...props} />;
  return <DialogTrigger {...props}>{children}</DialogTrigger>;
};
```

Repo conventions:

- Use function components and existing UI primitives.
- Keep Polish UI copy unchanged unless the fix requires wording.
- No broad modal abstraction changes.

## Commands you will need

| Purpose           | Command            | Expected on success            |
| ----------------- | ------------------ | ------------------------------ |
| Typecheck         | `pnpm check-types` | exit 0                         |
| Lint/format check | `pnpm check`       | exit 0                         |
| Tests             | `pnpm test`        | exit 0 if Plan 002 is complete |

## Scope

**In scope**:

- `apps/web/src/components/modals/add-skill-modal.tsx`

**Out of scope**:

- `ResponsiveDialog` internals.
- Other modal refactors.
- Skill API behavior.
- Visual redesign of the skills page.

## Git workflow

- Branch: `advisor/005-fix-add-skill-dialog`
- Commit message: `fix(skills): render add skill dialog content correctly`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Recompose AddSkillModal like AddHeroModal

In `apps/web/src/components/modals/add-skill-modal.tsx`:

1. Replace the `ResponsiveDialogTrigger render={...}` structure.
2. Use `<ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>`.
3. Render `<ResponsiveDialogContent className="sm:max-w-106.25">...</ResponsiveDialogContent>` as a sibling after the trigger.
4. Keep the existing form body, validation, submit handler, and copy unchanged.
5. Keep `ResponsiveDialog` controlled by `open` and `setOpen`.

Target shape:

```tsx
<ResponsiveDialog onOpenChange={setOpen} open={open}>
  <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
  <ResponsiveDialogContent className="sm:max-w-106.25">
    <form ...>
      ...existing fields...
    </form>
  </ResponsiveDialogContent>
</ResponsiveDialog>
```

**Verify**: `pnpm check-types` → exit 0.

### Step 2: Run quality checks

**Verify**:

- `pnpm check` → exit 0.
- `pnpm test` → exit 0 if a test script exists; if no test script exists because Plan 002 was not executed, record that and do not add test infrastructure in this plan.

## Test plan

No new test is required for this small composition fix unless component testing infrastructure already exists. Manual verification: open a skill range page, click “Dodaj zestaw,” confirm the dialog opens on desktop and drawer opens on mobile width, submit validation still shows field errors.

## Done criteria

- [ ] `AddSkillModal` uses trigger/content sibling composition.
- [ ] Form content is no longer passed as `ResponsiveDialogTrigger.render`.
- [ ] No files outside scope modified.
- [ ] `pnpm check-types` and `pnpm check` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report if:

- `ResponsiveDialogTrigger` API changed and no longer supports `asChild`.
- The caller no longer passes a valid button-like `trigger` node.
- Fixing this requires changing shared dialog primitives.

## Maintenance notes

When adding modals, copy the sibling trigger/content pattern from `add-hero-modal.tsx`. Reviewers should watch for content accidentally placed inside trigger render props.

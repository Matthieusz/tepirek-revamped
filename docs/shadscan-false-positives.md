# Shadscan false-positive register

This register records detector findings that do not describe a missing user-facing control. The UI and its contracts remain the source of truth; detector output must not be addressed by adding duplicate infrastructure.

| Detector | Verified evidence | Regression coverage |
| --- | --- | --- |
| `error-boundary-present` | The root route sets `errorComponent: RootErrorBoundary`. The boundary renders normalized error text and a retry button, and child routes inherit it. | `apps/web/src/routes/-metadata.test.ts` and `apps/web/src/routes/-root-error-boundary.test.tsx` |
| `validation-wired-to-form` | All 24 production `useAppForm` calls provide TanStack Form schema validators. The only unvalidated call is the rendering fixture in `form-fields.test.tsx`. | `apps/web/src/components/forms/app-form.test.tsx` and `apps/web/src/components/forms/form-fields.test.tsx` |
| `async-action-pending-state` | Production forms derive `isSubmitting`, disable submission/close triggers, and show pending copy or spinners. TanStack Form blocks duplicate submissions. The shared form also exposes `aria-busy` while pending. | `apps/web/src/components/forms/app-form.test.tsx` (`restores defaults and blocks duplicate submissions while pending`) |
| `images-have-alt` | Hero image renderers use the hero name for alternative text. `HeroSummary.name` is a `Schema.NonEmptyString`, so the source contract cannot provide an empty name. | `packages/api/src/http-api-contract.test.ts` (`keeps hero names non-empty for image alternative text`) |
| `links-have-accessible-names` | Breadcrumb entries with missing or empty labels are filtered before links or pages are rendered. | `apps/web/src/components/breadcrumb-nav.test.tsx` (`does not render empty route labels as links`) |
| dialog titles and field labels | `ResponsiveDialogContent` requires a `title` and renders it through the desktop/mobile title primitives. Shared form fields require a label and render a statically associated label element. | `apps/web/src/components/ui/responsive-dialog.test.tsx` and `apps/web/src/components/forms/form-fields.test.tsx` |

If a detector still reports one of these findings, record it here as a verified detector limitation after rerunning the corresponding regression test. Do not remove the accessible markup or weaken the source contracts to satisfy the score.

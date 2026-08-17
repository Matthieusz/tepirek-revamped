import { useSelector } from "@tanstack/react-form";
import type { AnyFormApi } from "@tanstack/react-form";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ReactNode, SubmitEvent } from "react";

import type { AuthFormSubmissionError } from "@/lib/auth-form-behavior";
import type { FormSubmissionError } from "@/lib/form-submission";

const FOCUSABLE_CONTROL_SELECTOR =
  'button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface InvalidControl {
  readonly id: string;
  readonly label: string;
}

const getInvalidControls = (
  form: HTMLFormElement
): readonly InvalidControl[] => {
  const controls: InvalidControl[] = [];

  for (const invalidElement of form.querySelectorAll<HTMLElement>(
    '[aria-invalid="true"]'
  )) {
    const control = invalidElement.matches(FOCUSABLE_CONTROL_SELECTOR)
      ? invalidElement
      : invalidElement.querySelector<HTMLElement>(FOCUSABLE_CONTROL_SELECTOR);
    if (control === null || control.id.length === 0) {
      continue;
    }

    const label =
      control.getAttribute("aria-label") ??
      Array.from(form.querySelectorAll<HTMLLabelElement>("label"))
        .find((candidate) => candidate.htmlFor === control.id)
        ?.textContent?.trim() ??
      control.id;
    if (controls.some((candidate) => candidate.id === control.id)) {
      continue;
    }

    controls.push({ id: control.id, label });
  }

  return controls;
};

const focusControl = (form: HTMLFormElement, id: string): void => {
  const control = Array.from(form.querySelectorAll<HTMLElement>("[id]")).find(
    (candidate) => candidate.id === id
  );
  control?.focus();
};

interface FormProps extends Omit<React.ComponentProps<"form">, "action"> {
  readonly form: AnyFormApi;
}

/** Renders a TanStack form with native validation disabled and invalid-field focus management. */
export const Form = ({
  children,
  form,
  onSubmit,
  ...props
}: FormProps): ReactNode => {
  const formRef = useRef<HTMLFormElement>(null);
  const errorSummaryId = useId();
  const submissionAttempts = useSelector(
    form.store,
    (state) => state.submissionAttempts
  );
  const validationErrorCount = useSelector(
    form.store,
    (state) =>
      Object.values(state.fieldMeta).filter(
        (meta) => (meta?.errors?.length ?? 0) > 0
      ).length
  );
  const [invalidControls, setInvalidControls] = useState<
    readonly InvalidControl[]
  >([]);
  const lastFocusedSubmissionAttempt = useRef(0);

  useEffect(() => {
    if (submissionAttempts === 0) {
      lastFocusedSubmissionAttempt.current = 0;
      return;
    }

    const formElement = formRef.current;
    if (formElement === null) {
      return;
    }

    const controls = getInvalidControls(formElement);
    if (lastFocusedSubmissionAttempt.current === submissionAttempts) {
      return;
    }

    const firstControl = controls[0];
    if (firstControl !== undefined) {
      focusControl(formElement, firstControl.id);
      lastFocusedSubmissionAttempt.current = submissionAttempts;
    }
  }, [submissionAttempts, validationErrorCount]);

  const syncInvalidControls = (): void => {
    const formElement = formRef.current;
    if (formElement === null) {
      return;
    }
    const controls = getInvalidControls(formElement);
    setInvalidControls(controls.length >= 3 ? controls : []);
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setInvalidControls([]);
    onSubmit?.(event);
    void form.handleSubmit().then(syncInvalidControls, syncInvalidControls);
  };

  return (
    <form {...props} noValidate onSubmit={handleSubmit} ref={formRef}>
      {invalidControls.length >= 3 && (
        <div
          aria-labelledby={errorSummaryId}
          className="border-destructive/30 bg-destructive/5 rounded-md border p-3 text-sm"
          role="region"
          tabIndex={-1}
        >
          <p className="text-destructive font-medium" id={errorSummaryId}>
            Formularz zawiera błędy. Popraw zaznaczone pola.
          </p>
          <ul className="text-destructive mt-2 list-inside list-disc">
            {invalidControls.map((control) => (
              <li key={control.id}>
                <button
                  className="underline underline-offset-2"
                  onClick={() => {
                    const formElement = formRef.current;
                    if (formElement !== null) {
                      focusControl(formElement, control.id);
                    }
                  }}
                  type="button"
                >
                  {control.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </form>
  );
};

type FormFailure = FormSubmissionError | AuthFormSubmissionError;

interface FormFeedbackProps {
  readonly failure?: FormFailure | undefined;
  readonly successMessage?: string;
}

/** Renders typed application submission feedback. */
export const FormFeedback = ({
  failure,
  successMessage,
}: FormFeedbackProps): ReactNode => {
  if (failure !== undefined) {
    return (
      <p
        aria-live="assertive"
        className="text-destructive text-sm"
        role="alert"
      >
        {failure.message}
      </p>
    );
  }

  if (successMessage !== undefined) {
    return (
      <p aria-live="polite" className="text-primary text-sm" role="status">
        {successMessage}
      </p>
    );
  }

  return null;
};

/** Returns a predicate that prevents closing a form while TanStack is submitting. */
export const useCanCloseForm = (isSubmitting: boolean): (() => boolean) =>
  useCallback(() => !isSubmitting, [isSubmitting]);

import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import {
  startTransition,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ReactNode, SubmitEvent } from "react";

import { getErrorMessage } from "@/lib/errors";

const FOCUSABLE_CONTROL_SELECTOR =
  'button, input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface InvalidControl {
  readonly id: string;
  readonly label: string;
}

type EffectFormResult = AsyncResult.AsyncResult<unknown, unknown>;

interface EffectFormProps extends Omit<React.ComponentProps<"form">, "action"> {
  readonly action: (formData: FormData) => void | Promise<void>;
  readonly submitResult?: EffectFormResult;
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

/**
 * Renders an Effect Form submit target with native validation disabled and
 * schema failures focused on their first invalid control.
 */
export const EffectForm = ({
  action,
  children,
  onSubmit,
  submitResult,
  ...props
}: EffectFormProps): ReactNode => {
  const formRef = useRef<HTMLFormElement>(null);
  const errorSummaryId = useId();
  const [invalidControls, setInvalidControls] = useState<
    readonly InvalidControl[]
  >([]);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit?.(event);

    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };

  useEffect(() => {
    if (submitResult === undefined || !AsyncResult.isFailure(submitResult)) {
      setInvalidControls([]);
      return;
    }

    const form = formRef.current;
    if (form !== null) {
      const controls = getInvalidControls(form);
      setInvalidControls(controls.length >= 3 ? controls : []);
      const firstControl = controls[0];
      if (firstControl !== undefined) {
        focusControl(form, firstControl.id);
      }
    }
  }, [submitResult]);

  return (
    <form {...props} noValidate onSubmit={handleSubmit} ref={formRef}>
      {invalidControls.length >= 3 && (
        <div
          aria-labelledby={errorSummaryId}
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
          role="region"
          tabIndex={-1}
        >
          <p className="font-medium text-destructive" id={errorSummaryId}>
            Formularz zawiera błędy. Popraw zaznaczone pola.
          </p>
          <ul className="mt-2 list-inside list-disc text-destructive">
            {invalidControls.map((control) => (
              <li key={control.id}>
                <button
                  className="underline underline-offset-2"
                  onClick={() => {
                    const form = formRef.current;
                    if (form !== null) {
                      focusControl(form, control.id);
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

interface EffectFormFeedbackProps {
  readonly failureMessage?: string;
  readonly result: EffectFormResult;
  readonly successMessage?: string;
}

/** Renders one persistent, accessible message for a form submission result. */
export const EffectFormFeedback = ({
  failureMessage = "Nie udało się wysłać formularza. Spróbuj ponownie.",
  result,
  successMessage,
}: EffectFormFeedbackProps): ReactNode => {
  if (AsyncResult.isFailure(result)) {
    const error = AsyncResult.error(result);
    if (Option.exists(error, Schema.isSchemaError)) {
      return null;
    }

    const message = Option.match(error, {
      onNone: () => failureMessage,
      onSome: (value) => getErrorMessage(value, failureMessage),
    });

    return (
      <p
        aria-live="assertive"
        className="text-destructive text-sm"
        role="alert"
      >
        {message}
      </p>
    );
  }

  if (successMessage !== undefined && AsyncResult.isSuccess(result)) {
    return (
      <p aria-live="polite" className="text-primary text-sm" role="status">
        {successMessage}
      </p>
    );
  }

  return null;
};

/**
 * Allows dirty forms to be discarded without browser or route confirmations.
 * Dialogs still remain open while their submission is in progress.
 */
export const useEffectFormProtection = (
  _isDirty: boolean,
  isSubmitting = false
): (() => boolean) => useCallback(() => !isSubmitting, [isSubmitting]);

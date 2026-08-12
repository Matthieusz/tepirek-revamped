import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Creates a stable DOM id for a field path, optionally preserving a caller-provided id. */
export const getFieldId = (path: string, explicitId?: string): string =>
  explicitId ?? `field-${path.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;

/** Creates the error element id associated with a rendered field control. */
export const getFieldErrorId = (fieldId: string): string => `${fieldId}-error`;

const getIssueMessage = (error: unknown): string | undefined => {
  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return undefined;
};

/** Returns the first safe message from TanStack validation errors. */
export const getFieldErrorMessage = (
  errors: readonly unknown[]
): string | undefined => {
  for (const error of errors) {
    const message = getIssueMessage(error);
    if (message !== undefined) {
      return message;
    }
  }

  return undefined;
};

interface FormFieldErrorProps {
  readonly error?: string | undefined;
  readonly id: string;
}

/** Renders a localized field error with a stable id. */
export const FormFieldError = ({
  error,
  id,
}: FormFieldErrorProps): ReactNode =>
  error === undefined ? null : (
    <p className="text-destructive text-sm" id={id}>
      {error}
    </p>
  );

interface FormFieldFrameProps {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  readonly error?: string | undefined;
  readonly fieldId: string;
  readonly helperText?: ReactNode;
  readonly label?: string;
}

/** Provides shared label, control, helper, and error spacing for form fields. */
export const FormFieldFrame = ({
  children,
  className,
  error,
  fieldId,
  helperText,
  label,
}: FormFieldFrameProps): ReactNode => (
  <div className={cn("grid gap-2", className)}>
    {label !== undefined && (
      <label className="text-sm font-medium" htmlFor={fieldId}>
        {label}
      </label>
    )}
    {children}
    {helperText}
    <FormFieldError error={error} id={getFieldErrorId(fieldId)} />
  </div>
);

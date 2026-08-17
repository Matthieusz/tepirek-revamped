import type { ReactNode } from "react";

import { getFieldErrorId } from "@/components/forms/form-field-utils";
import { cn } from "@/lib/utils";

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
      <label
        className="text-sm font-medium"
        htmlFor={fieldId}
        id={`${fieldId}-label`}
      >
        {label}
      </label>
    )}
    {children}
    {helperText}
    <FormFieldError error={error} id={getFieldErrorId(fieldId)} />
  </div>
);

import * as Option from "effect/Option";
import type { ReactNode } from "react";

/** Creates a stable DOM id for a field path, optionally preserving a caller-provided suffix. */
export const getFieldId = (path: string, explicitId?: string): string =>
  explicitId ?? `field-${path.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;

/** Creates the error element id associated with a rendered field control. */
export const getFieldErrorId = (fieldId: string): string => `${fieldId}-error`;

interface EffectFieldErrorProps {
  readonly error: Option.Option<string>;
  readonly id: string;
}

/** Renders a localized field error with a stable id. */
export const EffectFieldError = ({
  error,
  id,
}: EffectFieldErrorProps): ReactNode =>
  Option.match(error, {
    onNone: () => null,
    onSome: (message) => (
      <p className="text-destructive text-sm" id={id}>
        {message}
      </p>
    ),
  });

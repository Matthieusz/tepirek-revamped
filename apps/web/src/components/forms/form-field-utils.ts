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

/** Creates a stable DOM id for a field path, optionally preserving a caller-provided id. */
export const getFieldId = (path: string, explicitId?: string): string =>
  explicitId ?? `field-${path.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;

/** Creates the error element id associated with a rendered field control. */
export const getFieldErrorId = (fieldId: string): string => `${fieldId}-error`;

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

import { createFormHookContexts } from "@tanstack/react-form";

/** Shared contexts used by every TanStack form field in the web app. */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

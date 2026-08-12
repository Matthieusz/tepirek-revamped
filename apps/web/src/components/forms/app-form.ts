import { createFormHook } from "@tanstack/react-form";

import { fieldContext, formContext } from "./form-context";
import {
  CheckboxField,
  NumberField,
  StringSelectField,
  TextareaField,
  TextField,
} from "./form-fields";

/** Shared TanStack form hook with the application's accessible field components. */
export const { useAppForm } = createFormHook({
  fieldComponents: {
    CheckboxField,
    NumberField,
    StringSelectField,
    TextareaField,
    TextField,
  },
  fieldContext,
  formComponents: {},
  formContext,
});

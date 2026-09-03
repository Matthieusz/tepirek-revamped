import * as Predicate from "effect/Predicate";
import type { KeyboardEventHandler, ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useFieldContext } from "./form-context";
import { FormFieldFrame } from "./form-field-helpers";
import {
  getFieldErrorId,
  getFieldErrorMessage,
  getFieldId,
} from "./form-field-utils";

interface TextFieldProps {
  readonly autoComplete?: string;
  readonly autoFocus?: boolean;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly helperText?: ReactNode;
  readonly id?: string;
  readonly label: string;
  readonly maxLength?: number;
  readonly onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly type?: "email" | "number" | "password" | "text";
}

interface CheckboxFieldProps {
  readonly className?: string;
  readonly label: string;
}

interface StringSelectFieldProps {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly label: string;
  readonly loading?: boolean;
  readonly options: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly placeholder?: string;
}

const useFieldPresentation = <TData,>() => {
  const field = useFieldContext<TData>();
  const error = getFieldErrorMessage(field.state.meta.errors);
  const showError =
    error !== undefined &&
    (field.state.meta.isTouched || field.form.state.submissionAttempts > 0);
  const fieldId = getFieldId(field.name);

  return {
    error: showError ? error : undefined,
    field,
    fieldId,
  };
};

/** Renders an accessible string select backed by TanStack Form state. */
export const StringSelectField = (props: StringSelectFieldProps): ReactNode => {
  const { error, field, fieldId } = useFieldPresentation<string>();
  const errorId = getFieldErrorId(fieldId);

  return (
    <FormFieldFrame
      className={props.className}
      error={error}
      fieldId={fieldId}
      label={props.label}
    >
      <Select
        disabled={props.disabled}
        name={field.name}
        onValueChange={(value) => {
          if (value !== null) {
            field.handleChange(value);
          }
        }}
        value={field.state.value}
      >
        <SelectTrigger
          aria-describedby={error === undefined ? undefined : errorId}
          aria-errormessage={error === undefined ? undefined : errorId}
          aria-invalid={error !== undefined || undefined}
          aria-labelledby={`${fieldId}-label`}
          id={fieldId}
          onBlur={field.handleBlur}
        >
          <SelectValue placeholder={props.placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {props.loading ? (
              <SelectItem disabled value="loading">
                Ładowanie...
              </SelectItem>
            ) : (
              props.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FormFieldFrame>
  );
};

/** Renders a controlled checkbox backed by TanStack Form state. */
export const CheckboxField = (props: CheckboxFieldProps): ReactNode => {
  const { error, field, fieldId } = useFieldPresentation<boolean>();
  const errorId = getFieldErrorId(fieldId);

  return (
    <FormFieldFrame className={props.className} error={error} fieldId={fieldId}>
      <div className="flex items-center gap-2">
        <Checkbox
          aria-describedby={error === undefined ? undefined : errorId}
          aria-errormessage={error === undefined ? undefined : errorId}
          aria-invalid={error !== undefined || undefined}
          aria-labelledby={`${fieldId}-label`}
          checked={field.state.value}
          id={fieldId}
          name={field.name}
          onBlur={field.handleBlur}
          onCheckedChange={(value) => {
            if (Predicate.isBoolean(value)) {
              field.handleChange(value);
            }
          }}
        />
        <Label
          className="text-sm font-medium"
          htmlFor={fieldId}
          id={`${fieldId}-label`}
        >
          {props.label}
        </Label>
      </div>
    </FormFieldFrame>
  );
};

/** Renders a controlled text field backed by TanStack Form state. */
export const TextField = (props: TextFieldProps): ReactNode => {
  const { error, field } = useFieldPresentation<string>();
  const resolvedFieldId = getFieldId(field.name, props.id);
  const errorId = getFieldErrorId(resolvedFieldId);

  return (
    <FormFieldFrame
      className={props.className}
      error={error}
      fieldId={resolvedFieldId}
      helperText={props.helperText}
      label={props.label}
    >
      <Input
        aria-describedby={error === undefined ? undefined : errorId}
        aria-errormessage={error === undefined ? undefined : errorId}
        aria-invalid={error !== undefined || undefined}
        aria-labelledby={`${resolvedFieldId}-label`}
        aria-required={props.required || undefined}
        autoComplete={props.autoComplete}
        autoFocus={props.autoFocus}
        disabled={props.disabled}
        id={resolvedFieldId}
        maxLength={props.maxLength}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        onKeyDown={props.onKeyDown}
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        value={field.state.value}
      />
    </FormFieldFrame>
  );
};

/** Renders a controlled number input whose string value is parsed by form validation. */
export const NumberField = (
  props: Omit<TextFieldProps, "autoComplete" | "type">
): ReactNode => {
  const { error, field } = useFieldPresentation<string>();
  const resolvedFieldId = getFieldId(field.name, props.id);
  const errorId = getFieldErrorId(resolvedFieldId);

  return (
    <FormFieldFrame
      className={props.className}
      error={error}
      fieldId={resolvedFieldId}
      helperText={props.helperText}
      label={props.label}
    >
      <Input
        aria-describedby={error === undefined ? undefined : errorId}
        aria-errormessage={error === undefined ? undefined : errorId}
        aria-invalid={error !== undefined || undefined}
        aria-labelledby={`${resolvedFieldId}-label`}
        aria-required={props.required || undefined}
        disabled={props.disabled}
        id={resolvedFieldId}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={props.placeholder}
        type="number"
        value={field.state.value}
      />
    </FormFieldFrame>
  );
};

/** Renders a controlled textarea backed by TanStack Form state. */
export const TextareaField = (
  props: Omit<TextFieldProps, "autoComplete" | "type">
): ReactNode => {
  const { error, field } = useFieldPresentation<string>();
  const resolvedFieldId = getFieldId(field.name, props.id);
  const errorId = getFieldErrorId(resolvedFieldId);

  return (
    <FormFieldFrame
      className={props.className}
      error={error}
      fieldId={resolvedFieldId}
      helperText={props.helperText}
      label={props.label}
    >
      <Textarea
        aria-describedby={error === undefined ? undefined : errorId}
        aria-errormessage={error === undefined ? undefined : errorId}
        aria-invalid={error !== undefined || undefined}
        aria-labelledby={`${resolvedFieldId}-label`}
        aria-required={props.required || undefined}
        disabled={props.disabled}
        id={resolvedFieldId}
        maxLength={props.maxLength}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={props.placeholder}
        value={field.state.value}
      />
    </FormFieldFrame>
  );
};

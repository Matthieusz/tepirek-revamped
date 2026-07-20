import type { FormReact } from "@lucas-barake/effect-form-react";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import type { ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  EffectFieldError,
  getFieldErrorId,
  getFieldId,
} from "./effect-form-field-helpers";

const decodeNumber = Schema.decodeUnknownOption(Schema.NumberFromString);

interface TextFieldProps {
  readonly autoComplete?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly id?: string;
  readonly label: string;
  readonly maxLength?: number;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly type?: "email" | "number" | "password" | "text";
}

interface EffectFieldFrameProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly error: Option.Option<string>;
  readonly fieldId: string;
  readonly helperText?: ReactNode;
  readonly label?: string;
}

/** Provides the shared label, control, helper, and error spacing for Effect fields. */
export const EffectFieldFrame = ({
  children,
  className,
  error,
  fieldId,
  helperText,
  label,
}: EffectFieldFrameProps) => (
  <div className={cn("grid gap-2", className)}>
    {label !== undefined && (
      <Label className="text-sm font-medium" htmlFor={fieldId}>
        {label}
      </Label>
    )}
    {children}
    {helperText}
    <EffectFieldError error={error} id={getFieldErrorId(fieldId)} />
  </div>
);

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

/** Renders an accessible string select backed by Effect Form state. */
export const EffectStringSelectField: FormReact.FieldComponent<
  string,
  StringSelectFieldProps
> = ({ field, props }) => {
  const fieldId = getFieldId(field.path);
  const hasError = Option.isSome(field.error);
  const errorId = getFieldErrorId(fieldId);

  return (
    <EffectFieldFrame
      className={props.className ?? ""}
      error={field.error}
      fieldId={fieldId}
      label={props.label}
    >
      <Select
        disabled={props.disabled}
        name={field.path}
        onValueChange={(value) => value !== null && field.onChange(value)}
        value={field.value}
      >
        <SelectTrigger
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError}
          id={fieldId}
          onBlur={field.onBlur}
        >
          <SelectValue placeholder={props.placeholder} />
        </SelectTrigger>
        <SelectContent>
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
        </SelectContent>
      </Select>
    </EffectFieldFrame>
  );
};

/** Renders a controlled, accessible checkbox backed by Effect Form state. */
export const EffectCheckboxField: FormReact.FieldComponent<
  boolean,
  CheckboxFieldProps
> = ({ field, props }) => {
  const fieldId = getFieldId(field.path);
  const hasError = Option.isSome(field.error);
  const errorId = getFieldErrorId(fieldId);

  return (
    <EffectFieldFrame
      className={props.className ?? ""}
      error={field.error}
      fieldId={fieldId}
    >
      <div className="flex items-center gap-2">
        <Checkbox
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError}
          checked={field.value}
          id={fieldId}
          name={field.path}
          onBlur={field.onBlur}
          onCheckedChange={(value) =>
            Predicate.isBoolean(value) && field.onChange(value)
          }
        />
        <Label className="text-sm font-medium" htmlFor={fieldId}>
          {props.label}
        </Label>
      </div>
    </EffectFieldFrame>
  );
};

/** Renders a controlled, accessible text field backed by Effect Form state. */
export const EffectTextField: FormReact.FieldComponent<
  string,
  TextFieldProps
> = ({ field, props }) => {
  const fieldId = getFieldId(field.path, props.id);
  const hasError = Option.isSome(field.error);
  const errorId = getFieldErrorId(fieldId);

  return (
    <EffectFieldFrame
      className={props.className ?? ""}
      error={field.error}
      fieldId={fieldId}
      label={props.label}
    >
      <Input
        aria-describedby={hasError ? errorId : undefined}
        aria-invalid={hasError}
        autoComplete={props.autoComplete}
        disabled={props.disabled}
        id={fieldId}
        maxLength={props.maxLength}
        name={field.path}
        onBlur={field.onBlur}
        onChange={(event) => field.onChange(event.target.value)}
        placeholder={props.placeholder}
        aria-required={props.required || undefined}
        type={props.type ?? "text"}
        value={field.value}
      />
    </EffectFieldFrame>
  );
};

/** Renders a controlled, accessible number field backed by Effect Form state. */
export const EffectNumberField: FormReact.FieldComponent<
  number,
  Omit<TextFieldProps, "autoComplete" | "type">
> = ({ field, props }) => {
  const fieldId = getFieldId(field.path, props.id);
  const hasError = Option.isSome(field.error);
  const errorId = getFieldErrorId(fieldId);

  return (
    <EffectFieldFrame
      className={props.className ?? ""}
      error={field.error}
      fieldId={fieldId}
      label={props.label}
    >
      <Input
        aria-describedby={hasError ? errorId : undefined}
        aria-invalid={hasError}
        disabled={props.disabled}
        id={fieldId}
        name={field.path}
        onBlur={field.onBlur}
        onChange={(event) =>
          field.onChange(
            Option.getOrElse(decodeNumber(event.target.value), () => 0)
          )
        }
        placeholder={props.placeholder}
        aria-required={props.required || undefined}
        type="number"
        value={field.value}
      />
    </EffectFieldFrame>
  );
};

/** Renders a controlled, accessible textarea backed by Effect Form state. */
export const EffectTextareaField: FormReact.FieldComponent<
  string,
  Omit<TextFieldProps, "autoComplete" | "type">
> = ({ field, props }) => {
  const fieldId = getFieldId(field.path, props.id);
  const hasError = Option.isSome(field.error);
  const errorId = getFieldErrorId(fieldId);

  return (
    <EffectFieldFrame
      className={props.className ?? ""}
      error={field.error}
      fieldId={fieldId}
      label={props.label}
    >
      <Textarea
        aria-describedby={hasError ? errorId : undefined}
        aria-invalid={hasError}
        disabled={props.disabled}
        id={fieldId}
        maxLength={props.maxLength}
        name={field.path}
        onBlur={field.onBlur}
        onChange={(event) => field.onChange(event.target.value)}
        placeholder={props.placeholder}
        aria-required={props.required || undefined}
        value={field.value}
      />
    </EffectFieldFrame>
  );
};

import { CalculatorIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSelector } from "@tanstack/react-form";
import type { AnyFormApi } from "@tanstack/react-form";
import type { ReactNode } from "react";

import { Form } from "@/components/forms/form";
import { FormFieldFrame } from "@/components/forms/form-field-helpers";
import {
  getFieldErrorId,
  getFieldErrorMessage,
  getFieldId,
} from "@/components/forms/form-field-utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Renders the item calculator form with shared level/rarity framing and submission state. */
export const ItemParametersForm = ({
  children,
  form,
  submitLabel,
}: {
  readonly children: ReactNode;
  readonly form: AnyFormApi;
  readonly submitLabel: string;
}) => {
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <div className="border-border bg-card rounded-xl border">
      <div className="border-border border-b p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <HugeiconsIcon
            aria-hidden="true"
            icon={CalculatorIcon}
            className="size-5"
          />
          Parametry przedmiotu
        </h2>
        <p className="text-muted-foreground text-sm">
          Wprowadź poziom i wybierz rzadkość przedmiotu
        </p>
      </div>
      <div className="p-6">
        <Form className="grid gap-4" form={form}>
          {children}
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Obliczanie..." : submitLabel}
          </Button>
        </Form>
      </div>
    </div>
  );
};

interface ItemRarityFieldProps<Rarity extends string> {
  readonly rarities: readonly Rarity[];
  readonly colors: Readonly<Record<Rarity, string>>;
  readonly field: {
    readonly name: string;
    readonly form: { readonly state: { readonly submissionAttempts: number } };
    readonly state: {
      readonly value: Rarity;
      readonly meta: {
        readonly errors: readonly unknown[];
        readonly isTouched: boolean;
      };
    };
    readonly handleBlur: () => void;
    readonly handleChange: (value: Rarity) => void;
  };
}

/** Selects only a rarity supported by this calculator and preserves field validation semantics. */
export const ItemRarityField = <Rarity extends string>({
  colors,
  field,
  rarities,
}: ItemRarityFieldProps<Rarity>) => {
  const fieldId = getFieldId(field.name);
  const errorId = getFieldErrorId(fieldId);
  const error = getFieldErrorMessage(field.state.meta.errors);

  const showError =
    error !== undefined &&
    (field.state.meta.isTouched || field.form.state.submissionAttempts > 0);

  return (
    <FormFieldFrame
      error={showError ? error : undefined}
      fieldId={fieldId}
      label="Rzadkość przedmiotu"
    >
      <Select
        name={field.name}
        onValueChange={(value) => {
          const rarity = rarities.find((item) => item === value);

          if (rarity !== undefined) {
            field.handleChange(rarity);
          }
        }}
        value={field.state.value}
      >
        <SelectTrigger
          aria-describedby={showError ? errorId : undefined}
          aria-errormessage={showError ? errorId : undefined}
          aria-invalid={showError || undefined}
          aria-labelledby={`${fieldId}-label`}
          id={fieldId}
          onBlur={field.handleBlur}
        >
          <SelectValue placeholder="Wybierz rzadkość" />
        </SelectTrigger>
        <SelectContent>
          {rarities.map((rarity) => (
            <SelectItem key={rarity} value={rarity}>
              <span className={`font-medium ${colors[rarity]}`}>
                {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldFrame>
  );
};

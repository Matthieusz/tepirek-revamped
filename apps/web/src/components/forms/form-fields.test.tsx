import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useAppForm } from "@/components/forms/app-form";
import { Form } from "@/components/forms/form";
import {
  FormFieldFrame,
  getFieldErrorMessage,
} from "@/components/forms/form-field-helpers";

const FieldForm = () => {
  const form = useAppForm({
    defaultValues: {
      confirmed: true,
      description: "Opis",
      level: 1.5,
      name: "Ala",
      profession: "mage",
    },
    onSubmit: async () => undefined,
  });

  return (
    <form.AppForm>
      <Form form={form}>
        <form.AppField name="name">
          {(field) => <field.TextField label="Nazwa" required />}
        </form.AppField>
        <form.AppField name="level">
          {(field) => <field.NumberField label="Poziom" />}
        </form.AppField>
        <form.AppField name="description">
          {(field) => <field.TextareaField label="Opis" />}
        </form.AppField>
        <form.AppField name="confirmed">
          {(field) => <field.CheckboxField label="Potwierdzam" />}
        </form.AppField>
        <form.AppField name="profession">
          {(field) => (
            <field.StringSelectField
              label="Profesja"
              options={[{ label: "Mag", value: "mage" }]}
            />
          )}
        </form.AppField>
      </Form>
    </form.AppForm>
  );
};

describe("TanStack form fields", () => {
  it("renders controlled text, number, textarea, checkbox, and select fields", () => {
    const markup = renderToStaticMarkup(<FieldForm />);

    expect(markup).toContain('name="name"');
    expect(markup).toContain('value="Ala"');
    expect(markup).toContain('aria-required="true"');
    expect(markup).toContain('type="number"');
    expect(markup).toContain('value="1.5"');
    expect(markup).toContain("Opis</textarea>");
    expect(markup).toContain('name="confirmed"');
    expect(markup).toContain('aria-checked="true"');
    expect(markup).toContain('name="profession"');
    expect(markup).toContain('for="field-name"');
  });

  it("connects helper and error content to the labelled control", () => {
    const markup = renderToStaticMarkup(
      <FormFieldFrame
        error="Wartość jest wymagana"
        fieldId="field-name"
        helperText={<p id="field-name-helper">Pomoc</p>}
        label="Nazwa"
      >
        <input
          aria-describedby="field-name-helper field-name-error"
          id="field-name"
        />
      </FormFieldFrame>
    );

    expect(markup).toContain('for="field-name"');
    expect(markup).toContain('id="field-name-helper"');
    expect(markup).toContain('id="field-name-error"');
    expect(markup).toContain("Wartość jest wymagana");
  });

  it("projects Standard Schema issues to their localized messages", () => {
    expect(
      getFieldErrorMessage([
        { message: "Pierwszy błąd" },
        { message: "Drugi błąd" },
      ])
    ).toBe("Pierwszy błąd");
    expect(getFieldErrorMessage([new Error("Błąd pola")])).toBe("Błąd pola");
    expect(getFieldErrorMessage([null, 42])).toBeUndefined();
  });
});

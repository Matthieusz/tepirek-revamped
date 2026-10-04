import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useAppForm } from "@/components/forms/app-form";

import { ItemParametersForm, ItemRarityField } from "./item-parameters";

const rarities = ["heroiczny", "legendarny"] as const;

type Rarity = (typeof rarities)[number];

const colors = { heroiczny: "text-blue-500", legendarny: "text-orange-500" };

interface ItemFormValues {
  readonly itemLevel: string;
  readonly itemRarity: Rarity;
}

const defaultValues: ItemFormValues = {
  itemLevel: "280",
  itemRarity: "legendarny",
};

const ItemForm = () => {
  const form = useAppForm({
    defaultValues,
    onSubmit: () => {},
  });

  return (
    <form.AppForm>
      <ItemParametersForm form={form} submitLabel="Oblicz koszt">
        <form.AppField name="itemLevel">
          {(field) => <field.NumberField label="Poziom przedmiotu" />}
        </form.AppField>
        <form.Field name="itemRarity">
          {(field) => (
            <ItemRarityField
              field={field}
              colors={colors}
              rarities={rarities}
            />
          )}
        </form.Field>
      </ItemParametersForm>
    </form.AppForm>
  );
};

describe("shared item calculator form", () => {
  it("retains one labelled form, controlled inputs, and the calculator's submit label", () => {
    const markup = renderToStaticMarkup(<ItemForm />);

    expect(markup.match(/<form\s/gu)).toHaveLength(1);
    expect(markup).toContain("Parametry przedmiotu");
    expect(markup).toContain('type="number"');
    expect(markup).toContain('value="280"');
    expect(markup).toContain('name="itemRarity"');
    expect(markup).toContain('aria-labelledby="field-itemRarity-label"');
    expect(markup).toContain('for="field-itemRarity"');
    expect(markup).toContain('type="submit"');
    expect(markup).toContain("Oblicz koszt");
  });

  it("keeps rarity validation messages connected to a touched field", () => {
    const markup = renderToStaticMarkup(
      <ItemRarityField
        colors={colors}
        rarities={rarities}
        field={{
          form: { state: { submissionAttempts: 0 } },
          handleBlur: () => {},
          handleChange: () => {},
          name: "itemRarity",
          state: {
            meta: {
              errors: [{ message: "Wybierz rzadkość" }],
              isTouched: true,
            },
            value: "legendarny",
          },
        }}
      />
    );

    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="field-itemRarity-error"');
    expect(markup).toContain('aria-errormessage="field-itemRarity-error"');
    expect(markup).toContain('id="field-itemRarity-error"');
    expect(markup).toContain("Wybierz rzadkość");
  });
});

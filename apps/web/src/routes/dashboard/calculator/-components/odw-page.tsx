import * as Schema from "effect/Schema";
import { Calculator, Unlink } from "lucide-react";
import { useState } from "react";

import { useAppForm } from "@/components/forms/app-form";
import { Form } from "@/components/forms/form";
import {
  FormFieldFrame,
  getFieldErrorId,
  getFieldErrorMessage,
  getFieldId,
} from "@/components/forms/form-field-helpers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalculatorItemLevelSchema } from "@/features/calculators/form-schemas";
import {
  calculateUnbindCost,
  getOdwRarityInfo,
} from "@/features/calculators/odw";
import type { OdwRarity } from "@/features/calculators/odw";
import type { AuthSession } from "@/types/route";

type Rarity = OdwRarity;

const RARITY_ORDER = [
  "heroiczny",
  "legendarny",
  "unikatowy",
  "zwykły",
] as const satisfies readonly Rarity[];

const rarityColors = {
  heroiczny: "text-blue-500",
  legendarny: "text-orange-500",
  unikatowy: "text-yellow-500",
  zwykły: "text-gray-400",
} satisfies Record<Rarity, string>;

const rarityBgColors = {
  heroiczny: "bg-blue-500/10 border-blue-500/20",
  legendarny: "bg-orange-500/10 border-orange-500/20",
  unikatowy: "bg-yellow-500/10 border-yellow-500/20",
  zwykły: "bg-gray-500/10 border-gray-500/20",
} satisfies Record<Rarity, string>;

const rarityBonusText = {
  heroiczny: "+50%",
  legendarny: "+200%",
  unikatowy: "+20%",
  zwykły: "brak bonusu",
} satisfies Record<Rarity, string>;

const ItemRaritySchema = Schema.Literals([
  "zwykły",
  "unikatowy",
  "heroiczny",
  "legendarny",
]);
const OdwFormSchema = Schema.Struct({
  itemLevel: CalculatorItemLevelSchema,
  itemRarity: ItemRaritySchema,
});
const OdwFormValidator = Schema.toStandardSchemaV1(OdwFormSchema);

interface OdwResult {
  readonly baseValue: number;
  readonly isCapped: boolean;
  readonly itemLevel: number;
  readonly itemRarity: Rarity;
  readonly maxCost: number;
  readonly rarityMultiplier: number;
  readonly totalCost: number;
}

interface CalculatorOdwPageProps {
  session: AuthSession;
}

export default function CalculatorOdwPage(_props: CalculatorOdwPageProps) {
  const [result, setResult] = useState<OdwResult | null>(null);
  const form = useAppForm({
    defaultValues: { itemLevel: 280, itemRarity: "legendarny" as Rarity },
    onSubmit: async ({ value }) => {
      const decoded = await OdwFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const { baseValue, totalCost, isCapped } = calculateUnbindCost(
        decoded.value.itemLevel,
        decoded.value.itemRarity
      );
      const { maxCost, multiplier: rarityMultiplier } = getOdwRarityInfo(
        decoded.value.itemRarity
      );

      setResult({
        baseValue,
        isCapped,
        itemLevel: decoded.value.itemLevel,
        itemRarity: decoded.value.itemRarity,
        maxCost,
        rarityMultiplier,
        totalCost,
      });
    },
    validators: { onChange: OdwFormValidator },
  });

  return (
    <form.AppForm>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
            Kalkulator odwiązania
          </h1>
          <p className="text-muted-foreground">
            Oblicz koszt odwiązania przedmiotu na podstawie poziomu i rzadkości.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-6">
              <h2 className="flex items-center gap-2 font-semibold text-base">
                <Calculator className="size-5" />
                Parametry przedmiotu
              </h2>
              <p className="text-muted-foreground text-sm">
                Wprowadź poziom i wybierz rzadkość przedmiotu
              </p>
            </div>
            <div className="p-6">
              <Form className="grid gap-4" form={form}>
                <form.AppField name="itemLevel">
                  {(field) => <field.NumberField label="Poziom przedmiotu" />}
                </form.AppField>
                <form.Field name="itemRarity">
                  {(field) => {
                    const fieldId = getFieldId(field.name);
                    const error = getFieldErrorMessage(field.state.meta.errors);
                    const showError =
                      error !== undefined &&
                      (field.state.meta.isTouched ||
                        field.form.state.submissionAttempts > 0);
                    const errorId = getFieldErrorId(fieldId);

                    return (
                      <FormFieldFrame
                        error={showError ? error : undefined}
                        fieldId={fieldId}
                        label="Rzadkość przedmiotu"
                      >
                        <Select
                          name={field.name}
                          onValueChange={(value) => {
                            const rarity = RARITY_ORDER.find(
                              (item) => item === value
                            );
                            if (rarity !== undefined) {
                              field.handleChange(rarity);
                            }
                          }}
                          value={field.state.value}
                        >
                          <SelectTrigger
                            aria-describedby={showError ? errorId : undefined}
                            aria-invalid={showError || undefined}
                            id={fieldId}
                            onBlur={field.handleBlur}
                          >
                            <SelectValue placeholder="Wybierz rzadkość" />
                          </SelectTrigger>
                          <SelectContent>
                            {RARITY_ORDER.map((rarity) => (
                              <SelectItem key={rarity} value={rarity}>
                                <span
                                  className={`font-medium ${rarityColors[rarity]}`}
                                >
                                  {rarity.charAt(0).toUpperCase() +
                                    rarity.slice(1)}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormFieldFrame>
                    );
                  }}
                </form.Field>
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button
                      className="w-full"
                      disabled={isSubmitting}
                      type="submit"
                    >
                      {isSubmitting ? "Obliczanie..." : "Oblicz koszt"}
                    </Button>
                  )}
                </form.Subscribe>
              </Form>
            </div>
          </div>

          {result && (
            <div
              className={`rounded-xl border-2 ${rarityBgColors[result.itemRarity]} bg-card p-6`}
            >
              <div className="mb-4">
                <h2 className="flex items-center gap-2 font-semibold text-base">
                  <Unlink
                    className={`size-5 ${rarityColors[result.itemRarity]}`}
                  />
                  Koszt odwiązania
                </h2>
                <p className="text-muted-foreground text-sm">
                  Przedmiot poziom{" "}
                  <span className="font-semibold">{result.itemLevel}</span> ({" "}
                  <span
                    className={`font-semibold ${rarityColors[result.itemRarity]}`}
                  >
                    {result.itemRarity}
                  </span>
                  )
                </p>
              </div>
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="text-muted-foreground text-sm">
                      Wartość bazowa (10 + 0.1 × lvl)
                    </span>
                    <span className="font-semibold text-lg">
                      {result.baseValue.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="text-muted-foreground text-sm">
                      Mnożnik rzadkości
                    </span>
                    <span
                      className={`font-semibold text-lg ${rarityColors[result.itemRarity]}`}
                    >
                      ×{result.rarityMultiplier} (
                      {rarityBonusText[result.itemRarity]})
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
                    <span className="font-medium text-sm">
                      Całkowity koszt odwiązania
                    </span>
                    <span className="font-bold text-xl text-primary">
                      {result.totalCost.toLocaleString("pl-PL")} SŁ /{" "}
                      {Math.floor(result.totalCost / 80).toLocaleString(
                        "pl-PL"
                      )}{" "}
                      zł
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-6">
            <h2 className="flex items-center gap-2 font-semibold text-base">
              <Unlink className="size-5 text-muted-foreground" />
              Formuła obliczania
            </h2>
          </div>
          <div className="space-y-3 p-6 text-muted-foreground text-sm">
            <p>
              <strong>Formuła:</strong>{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                75 × round((10 + 0.1 × lvl) × mnożnik_rzadkości)
              </code>
            </p>
            <div className="grid gap-2">
              <p className="font-medium text-foreground">Mnożniki i limity:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  <span className={rarityColors.zwykły}>Zwykły</span> — ×1.0,
                  max 1500 SŁ (od lvl 101)
                </li>
                <li>
                  <span className={rarityColors.unikatowy}>Unikatowy</span> —
                  ×1.2, max 1800 SŁ (od lvl 100)
                </li>
                <li>
                  <span className={rarityColors.heroiczny}>Heroiczny</span> —
                  ×1.5, max 3375 SŁ (od lvl 200)
                </li>
                <li>
                  <span className={rarityColors.legendarny}>Legendarny</span> —
                  ×3.0, max 6750 SŁ (od lvl 200)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </form.AppForm>
  );
}

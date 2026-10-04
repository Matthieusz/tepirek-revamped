import { Unlink05Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as Schema from "effect/Schema";
import { useState } from "react";

import { useAppForm } from "@/components/forms/app-form";
import { CalculatorItemLevelFromStringSchema } from "@/features/calculators/form-schemas";
import {
  calculateUnbindCost,
  getOdwRarityInfo,
} from "@/features/calculators/odw";
import type { OdwRarity } from "@/features/calculators/odw";
import type { AuthSession } from "@/types/route";

import { ItemParametersForm, ItemRarityField } from "./item-parameters";

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
  itemLevel: CalculatorItemLevelFromStringSchema,
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

interface OdwFormValues {
  readonly itemLevel: string;
  readonly itemRarity: Rarity;
}

const ODW_DEFAULT_VALUES: OdwFormValues = {
  itemLevel: "280",
  itemRarity: "legendarny",
};

const CalculatorOdwPage = (_props: CalculatorOdwPageProps) => {
  const [result, setResult] = useState<OdwResult | null>(null);

  const form = useAppForm({
    defaultValues: ODW_DEFAULT_VALUES,
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
          <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
            Kalkulator odwiązania
          </h1>
          <p className="text-muted-foreground">
            Oblicz koszt odwiązania przedmiotu na podstawie poziomu i rzadkości.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ItemParametersForm form={form} submitLabel="Oblicz koszt">
            <form.AppField name="itemLevel">
              {(field) => <field.NumberField label="Poziom przedmiotu" />}
            </form.AppField>
            <form.Field name="itemRarity">
              {(field) => (
                <ItemRarityField
                  field={field}
                  colors={rarityColors}
                  rarities={RARITY_ORDER}
                />
              )}
            </form.Field>
          </ItemParametersForm>

          {result && (
            <div
              className={`rounded-xl border-2 ${rarityBgColors[result.itemRarity]} bg-card p-6`}
            >
              <div className="mb-4">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={Unlink05Icon}
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
                  <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                    <span className="text-muted-foreground text-sm">
                      Wartość bazowa (10 + 0.1 × lvl)
                    </span>
                    <span className="text-lg font-semibold">
                      {result.baseValue.toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                    <span className="text-muted-foreground text-sm">
                      Mnożnik rzadkości
                    </span>
                    <span
                      className={`text-lg font-semibold ${rarityColors[result.itemRarity]}`}
                    >
                      ×{result.rarityMultiplier} (
                      {rarityBonusText[result.itemRarity]})
                    </span>
                  </div>
                </div>

                <div className="border-border border-t pt-4">
                  <div className="bg-primary/10 flex items-center justify-between rounded-lg p-4">
                    <span className="text-sm font-medium">
                      Całkowity koszt odwiązania
                    </span>
                    <span className="text-primary text-xl font-bold">
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

        <div className="border-border bg-card rounded-xl border">
          <div className="border-border border-b p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <HugeiconsIcon
                aria-hidden="true"
                icon={Unlink05Icon}
                className="text-muted-foreground size-5"
              />
              Formuła obliczania
            </h2>
          </div>
          <div className="text-muted-foreground space-y-3 p-6 text-sm">
            <p>
              <strong>Formuła:</strong>{" "}
              <code className="bg-muted rounded px-1 py-0.5">
                75 × round((10 + 0.1 × lvl) × mnożnik_rzadkości)
              </code>
            </p>
            <div className="grid gap-2">
              <p className="text-foreground font-medium">Mnożniki i limity:</p>
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
};

export default CalculatorOdwPage;

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Calculator, Unlink } from "lucide-react";

import { EffectForm } from "@/components/forms/effect-form";
import {
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/effect-form-field-helpers";
import {
  EffectFieldFrame,
  EffectNumberField,
} from "@/components/forms/effect-form-fields";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateUnbindCost, getOdwRarityInfo } from "@/lib/calculators/odw";
import type { OdwRarity } from "@/lib/calculators/odw";
import { CalculatorItemLevelSchema } from "@/lib/form-schemas";
import type { AuthSession } from "@/types/route";

type Rarity = OdwRarity;

const RARITY_ORDER: Rarity[] = [
  "heroiczny",
  "legendarny",
  "unikatowy",
  "zwykły",
];

const rarityColors: Record<Rarity, string> = {
  heroiczny: "text-blue-500",
  legendarny: "text-orange-500",
  unikatowy: "text-yellow-500",
  zwykły: "text-gray-400",
};

const rarityBgColors: Record<Rarity, string> = {
  heroiczny: "bg-blue-500/10 border-blue-500/20",
  legendarny: "bg-orange-500/10 border-orange-500/20",
  unikatowy: "bg-yellow-500/10 border-yellow-500/20",
  zwykły: "bg-gray-500/10 border-gray-500/20",
};

const rarityBonusText: Record<Rarity, string> = {
  heroiczny: "+50%",
  legendarny: "+200%",
  unikatowy: "+20%",
  zwykły: "brak bonusu",
};

const ItemRaritySchema = Schema.Literals([
  "zwykły",
  "unikatowy",
  "heroiczny",
  "legendarny",
]);

const odwFormBuilder = FormBuilder.empty
  .addField("itemLevel", CalculatorItemLevelSchema)
  .addField("itemRarity", ItemRaritySchema);

interface OdwRaritySelectProps {
  readonly label: string;
}

const OdwRaritySelect: FormReact.FieldComponent<
  Rarity,
  OdwRaritySelectProps
> = ({ field, props }) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const hasError = Option.isSome(field.error);
  return (
    <EffectFieldFrame error={field.error} fieldId={fieldId} label={props.label}>
      <Select
        name={field.path}
        onValueChange={(val) => {
          const rarity = RARITY_ORDER.find((item) => item === val);
          if (rarity !== undefined) {
            field.onChange(rarity);
          }
        }}
        value={field.value}
      >
        <SelectTrigger
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError}
          id={fieldId}
          onBlur={field.onBlur}
        >
          <SelectValue placeholder="Wybierz rzadkość" />
        </SelectTrigger>
        <SelectContent>
          {RARITY_ORDER.map((rarity) => (
            <SelectItem key={rarity} value={rarity}>
              <span className={`font-medium ${rarityColors[rarity]}`}>
                {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </EffectFieldFrame>
  );
};

const odwForm = FormReact.make(odwFormBuilder, {
  fields: { itemLevel: EffectNumberField, itemRarity: OdwRaritySelect },
  mode: { validation: "onChange" },
  onSubmit: (_, { decoded }) =>
    Effect.sync(() => {
      const { baseValue, totalCost, isCapped } = calculateUnbindCost(
        decoded.itemLevel,
        decoded.itemRarity
      );
      const { maxCost, multiplier: rarityMultiplier } = getOdwRarityInfo(
        decoded.itemRarity
      );

      return {
        baseValue,
        isCapped,
        itemLevel: decoded.itemLevel,
        itemRarity: decoded.itemRarity,
        maxCost,
        rarityMultiplier,
        totalCost,
      };
    }),
});

interface CalculatorOdwPageProps {
  session: AuthSession;
}

export default function CalculatorOdwPage(_props: CalculatorOdwPageProps) {
  const submit = useAtomSet(odwForm.submit);
  const submitResult = useAtomValue(odwForm.submit);
  const result = AsyncResult.isSuccess(submitResult)
    ? submitResult.value
    : null;

  return (
    <odwForm.Initialize
      defaultValues={{ itemLevel: 280, itemRarity: "legendarny" as Rarity }}
    >
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
              {/* Calculator input is disposable and intentionally has no draft blocker. */}
              <EffectForm
                action={() => submit()}
                className="grid gap-4"
                submitResult={submitResult}
              >
                <odwForm.itemLevel label="Poziom przedmiotu" />
                <odwForm.itemRarity label="Rzadkość przedmiotu" />
                <Button
                  className="w-full"
                  disabled={submitResult.waiting}
                  type="submit"
                >
                  {submitResult.waiting ? "Obliczanie..." : "Oblicz koszt"}
                </Button>
              </EffectForm>
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
                  <span className="font-semibold">{result.itemLevel}</span> (
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
    </odwForm.Initialize>
  );
}

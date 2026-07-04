import { useForm } from "@tanstack/react-form";
import * as Schema from "effect/Schema";
import { Calculator, Unlink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateUnbindCost, getOdwRarityInfo } from "@/lib/calculators/odw";
import type { OdwRarity } from "@/lib/calculators/odw";
import type { AuthSession } from "@/types/route";

type Rarity = OdwRarity;

const MIN_LEVEL = 1;
const MAX_LEVEL = 300;

/** Display order of rarities in the form select (web rendering concern). */
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

const ItemLevelSchema = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: MAX_LEVEL, minimum: MIN_LEVEL })
);
const ItemRaritySchema = Schema.Literals([
  "zwykły",
  "unikatowy",
  "heroiczny",
  "legendarny",
]);
const formSchema = Schema.Struct({
  itemLevel: ItemLevelSchema,
  itemRarity: ItemRaritySchema,
});

interface CalculatorOdwPageProps {
  session: AuthSession;
}

export default function CalculatorOdwPage(_props: CalculatorOdwPageProps) {
  const [result, setResult] = useState<{
    itemLevel: number;
    itemRarity: Rarity;
    baseValue: number;
    rarityMultiplier: number;
    totalCost: number;
    isCapped: boolean;
    maxCost: number;
  } | null>(null);

  const form = useForm({
    defaultValues: {
      itemLevel: 280,
      itemRarity: "legendarny" as Rarity,
    } satisfies typeof formSchema.Type,
    onSubmit: ({ value }) => {
      const { baseValue, totalCost, isCapped } = calculateUnbindCost(
        value.itemLevel,
        value.itemRarity
      );
      const { maxCost, multiplier: rarityMultiplier } = getOdwRarityInfo(
        value.itemRarity
      );

      setResult({
        baseValue,
        isCapped,
        itemLevel: value.itemLevel,
        itemRarity: value.itemRarity,
        maxCost,
        rarityMultiplier,
        totalCost,
      });
    },
  });

  return (
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
        {/* Input Form */}
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
            <form
              className="grid gap-4"
              action={async () => {
                await form.handleSubmit();
              }}
            >
              <form.Field
                name="itemLevel"
                validators={{
                  onChange: ({ value }) =>
                    Schema.is(ItemLevelSchema)(value)
                      ? undefined
                      : `Podaj liczbę całkowitą od ${MIN_LEVEL} do ${MAX_LEVEL}`,
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="itemLevel">Poziom przedmiotu</Label>
                    <Input
                      aria-describedby="itemLevel-error"
                      aria-invalid={field.state.meta.errors.length > 0}
                      id="itemLevel"
                      max={MAX_LEVEL}
                      min={MIN_LEVEL}
                      onChange={(e) => {
                        field.handleChange(Number(e.target.value));
                      }}
                      type="number"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <div
                        className="text-destructive text-sm"
                        id="itemLevel-error"
                      >
                        {field.state.meta.errors[0]}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>
              <form.Field
                name="itemRarity"
                validators={{
                  onChange: ({ value }) =>
                    Schema.is(ItemRaritySchema)(value)
                      ? undefined
                      : "Wybierz poprawną rzadkość",
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="itemRarity">Rzadkość przedmiotu</Label>
                    <Select
                      onValueChange={(val) => {
                        if (val !== null) {
                          field.handleChange(val as Rarity);
                        }
                      }}
                      value={field.state.value}
                    >
                      <SelectTrigger id="itemRarity">
                        <SelectValue placeholder="Wybierz rzadkość" />
                      </SelectTrigger>
                      <SelectContent>
                        {RARITY_ORDER.map((rarity) => (
                          <SelectItem key={rarity} value={rarity}>
                            <span
                              className={`font-medium ${rarityColors[rarity]}`}
                            >
                              {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 && (
                      <div className="text-destructive text-sm">
                        {field.state.meta.errors[0]}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    className="w-full"
                    disabled={!canSubmit || isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? "Obliczanie..." : "Oblicz koszt"}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </div>
        </div>

        {/* Result */}
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
                    {Math.floor(result.totalCost / 80).toLocaleString("pl-PL")}{" "}
                    zł
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
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
                <span className={rarityColors.zwykły}>Zwykły</span> — ×1.0, max
                1500 SŁ (od lvl 101)
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
  );
}

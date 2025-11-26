import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Unlink } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Rarity = "zwykły" | "unikatowy" | "heroiczny" | "legendarny";

const MIN_LEVEL = 1;
const MAX_LEVEL = 300;

/** Rarity multipliers applied to base value */
const rarityMultipliers: Record<Rarity, number> = {
  zwykły: 1.0, // No bonus
  unikatowy: 1.2, // +20%
  heroiczny: 1.5, // +50%
  legendarny: 3.0, // +200%
};

/** Cap threshold for base value (i) per rarity */
const rarityCaps: Record<Rarity, { threshold: number; maxCost: number }> = {
  zwykły: { threshold: 20, maxCost: 1500 }, // i > 20
  unikatowy: { threshold: 20, maxCost: 1800 }, // i >= 20
  heroiczny: { threshold: 30, maxCost: 3375 }, // i >= 30
  legendarny: { threshold: 30, maxCost: 6750 }, // i >= 30
};

const rarityColors: Record<Rarity, string> = {
  zwykły: "text-gray-400",
  unikatowy: "text-yellow-500",
  heroiczny: "text-blue-500",
  legendarny: "text-orange-500",
};

const rarityBgColors: Record<Rarity, string> = {
  zwykły: "bg-gray-500/10 border-gray-500/20",
  unikatowy: "bg-yellow-500/10 border-yellow-500/20",
  heroiczny: "bg-blue-500/10 border-blue-500/20",
  legendarny: "bg-orange-500/10 border-orange-500/20",
};

const rarityBonusText: Record<Rarity, string> = {
  zwykły: "brak bonusu",
  unikatowy: "+20%",
  heroiczny: "+50%",
  legendarny: "+200%",
};

/**
 * Calculates unbind cost based on original game formula
 * Formula: 75 × round(i × rarity_multiplier) where i = 10 + 0.1 × level
 * With caps per rarity
 */
const calculateUnbindCost = (
  level: number,
  rarity: Rarity
): { baseValue: number; totalCost: number; isCapped: boolean } => {
  const baseValue = 10 + 0.1 * level; // i = 10 + 0.1 * a
  const cap = rarityCaps[rarity];
  const multiplier = rarityMultipliers[rarity];

  const isCapped =
    rarity === "zwykły"
      ? baseValue > cap.threshold
      : baseValue >= cap.threshold;

  if (isCapped) {
    return { baseValue, totalCost: cap.maxCost, isCapped: true };
  }

  // Apply multiplier and calculate cost
  const adjustedValue = baseValue * multiplier;
  const roundedValue = Math.round(adjustedValue);
  const totalCost = 75 * roundedValue;

  return { baseValue, totalCost, isCapped: false };
};

const formSchema = z.object({
  itemLevel: z
    .number()
    .int({ message: "Musi być liczbą całkowitą" })
    .min(MIN_LEVEL, { message: `Min: ${MIN_LEVEL}` })
    .max(MAX_LEVEL, { message: `Max: ${MAX_LEVEL}` }),
  itemRarity: z.enum(["zwykły", "unikatowy", "heroiczny", "legendarny"]),
});

export const Route = createFileRoute("/dashboard/calculator/odw")({
  component: RouteComponent,
  staticData: {
    crumb: "Kalkulator odwiązania",
  },
});

function RouteComponent() {
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
      itemLevel: 280 as number,
      itemRarity: "legendarny" as Rarity,
    },
    onSubmit: ({ value }) => {
      const { baseValue, totalCost, isCapped } = calculateUnbindCost(
        value.itemLevel,
        value.itemRarity
      );

      setResult({
        itemLevel: value.itemLevel,
        itemRarity: value.itemRarity,
        baseValue,
        rarityMultiplier: rarityMultipliers[value.itemRarity],
        totalCost,
        isCapped,
        maxCost: rarityCaps[value.itemRarity].maxCost,
      });
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="mb-2 font-bold text-2xl tracking-tight">
          Kalkulator odwiązania
        </h1>
        <p className="text-muted-foreground">
          Oblicz koszt odwiązania przedmiotu na podstawie poziomu i rzadkości.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Parametry przedmiotu
            </CardTitle>
            <CardDescription>
              Wprowadź poziom i wybierz rzadkość przedmiotu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
            >
              <form.Field
                name="itemLevel"
                validators={{
                  onChange: ({ value }) => {
                    const parsed = formSchema.shape.itemLevel.safeParse(value);
                    return parsed.success
                      ? undefined
                      : parsed.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="itemLevel">Poziom przedmiotu</Label>
                    <Input
                      aria-describedby="itemLevel-error"
                      aria-invalid={
                        field.state.meta.errors &&
                        field.state.meta.errors.length > 0
                      }
                      id="itemLevel"
                      max={MAX_LEVEL}
                      min={MIN_LEVEL}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                      type="number"
                      value={field.state.value}
                    />
                    {field.state.meta.errors &&
                      field.state.meta.errors.length > 0 && (
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
                  onChange: ({ value }) => {
                    const parsed = formSchema.shape.itemRarity.safeParse(value);
                    return parsed.success
                      ? undefined
                      : parsed.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="itemRarity">Rzadkość przedmiotu</Label>
                    <Select
                      onValueChange={(val) => field.handleChange(val as Rarity)}
                      value={field.state.value}
                    >
                      <SelectTrigger id="itemRarity">
                        <SelectValue placeholder="Wybierz rzadkość" />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(rarityMultipliers) as Rarity[]).map(
                          (rarity) => (
                            <SelectItem key={rarity} value={rarity}>
                              <span
                                className={`font-medium ${rarityColors[rarity]}`}
                              >
                                {rarity.charAt(0).toUpperCase() +
                                  rarity.slice(1)}
                              </span>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors &&
                      field.state.meta.errors.length > 0 && (
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
          </CardContent>
        </Card>

        {/* Result Card */}
        {result && (
          <Card className={`border-2 ${rarityBgColors[result.itemRarity]}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Unlink
                  className={`h-5 w-5 ${rarityColors[result.itemRarity]}`}
                />
                Koszt odwiązania
              </CardTitle>
              <CardDescription>
                Przedmiot poziom{" "}
                <span className="font-semibold">{result.itemLevel}</span> (
                <span
                  className={`font-semibold ${rarityColors[result.itemRarity]}`}
                >
                  {result.itemRarity}
                </span>
                )
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="border-t pt-4">
                <div className="flex items-center justify-between rounded-lg bg-yellow-500/10 p-4">
                  <span className="font-medium text-sm">
                    Całkowity koszt odwiązania
                  </span>
                  <span className="font-bold text-xl text-yellow-600">
                    {result.totalCost.toLocaleString("pl-PL")} SŁ /{" "}
                    {Math.floor(result.totalCost / 80).toLocaleString("pl-PL")}{" "}
                    zł
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlink className="h-5 w-5 text-muted-foreground" />
            Formuła obliczania
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground text-sm">
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
        </CardContent>
      </Card>
    </div>
  );
}

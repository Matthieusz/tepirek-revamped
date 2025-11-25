import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
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

type Rarity = "zwykły" | "unikatowy" | "heroiczny" | "ulepszony" | "legendarny";

interface RarityFactor {
  upgradeRarityFactor: number;
  upgradeGoldFactor: number;
}

const rarityFactors: Record<Rarity, RarityFactor> = {
  zwykły: { upgradeRarityFactor: 1, upgradeGoldFactor: 1 },
  unikatowy: { upgradeRarityFactor: 10, upgradeGoldFactor: 10 },
  heroiczny: { upgradeRarityFactor: 100, upgradeGoldFactor: 30 },
  ulepszony: { upgradeRarityFactor: -1, upgradeGoldFactor: 40 },
  legendarny: { upgradeRarityFactor: 1000, upgradeGoldFactor: 60 },
};

const upgradeLevelFactors = [0.0, 1.0, 2.1, 3.4, 5.0, 7.0];

const MIN_LEVEL = 1;
const MAX_LEVEL = 300;

const clampLevel = (n: number): number => {
  const v = Math.trunc(n);
  if (Number.isNaN(v)) {
    return MIN_LEVEL;
  }
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, v));
};

const formSchema = z.object({
  itemLevel: z
    .number()
    .int({ message: "Musi być liczbą całkowitą" })
    .min(MIN_LEVEL, { message: `Min: ${MIN_LEVEL}` })
    .max(MAX_LEVEL, { message: `Max: ${MAX_LEVEL}` }),
  itemRarity: z.enum([
    "zwykły",
    "unikatowy",
    "heroiczny",
    "ulepszony",
    "legendarny",
  ]),
});

function calculateUpgradePoints(lvl: number, rarity: Rarity): number[] {
  const level = clampLevel(lvl);
  const factors = rarityFactors[rarity];
  if (!factors) {
    throw new Error("Nieznana rzadkość przedmiotu");
  }

  const upgradeCosts: number[] = [];

  for (let n = 1; n <= 5; n++) {
    let cost: number;
    if (rarity === "ulepszony") {
      cost = upgradeLevelFactors[n] * (150 * level + 27_000);
    } else {
      cost =
        factors.upgradeRarityFactor * upgradeLevelFactors[n] * (180 + level);
    }
    upgradeCosts.push(cost);
  }

  return upgradeCosts;
}

function calculateDifferentialCosts(upgradeCosts: number[]): number[] {
  const differentialCosts: number[] = [];
  for (let i = 0; i < upgradeCosts.length; i++) {
    if (i === 0) {
      differentialCosts.push(upgradeCosts[i]);
    } else {
      differentialCosts.push(upgradeCosts[i] - upgradeCosts[i - 1]);
    }
  }
  return differentialCosts;
}

export const Route = createFileRoute("/dashboard/calculator/ulepa")({
  component: RouteComponent,
  loader: () => ({
    crumb: "Kalkulator ulepy",
  }),
});

function RouteComponent() {
  const [result, setResult] = useState<{
    differentialCosts: number[];
    totalUpgradeCost: number;
    total75Percent: number;
  } | null>(null);

  const form = useForm({
    defaultValues: {
      itemLevel: 280,
      itemRarity: "legendarny" as Rarity,
    },
    onSubmit: ({ value }) => {
      const upgradeCosts = calculateUpgradePoints(
        value.itemLevel,
        value.itemRarity
      );
      const differentialCosts = calculateDifferentialCosts(upgradeCosts);
      const totalUpgradeCost = differentialCosts.reduce(
        (sum, cost) => sum + cost,
        0
      );
      const total75Percent = totalUpgradeCost * 0.75;
      setResult({ differentialCosts, totalUpgradeCost, total75Percent });
    },
  });

  return (
    <div className="max-w-xl lg:w-full">
      <h1 className="mb-4 font-bold text-2xl">Kalkulator ulepy</h1>
      <p className="mb-6 text-muted-foreground">
        Oblicz koszty ulepszenia przedmiotu na podstawie poziomu i rzadkości.
      </p>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <div className="grid grid-cols-2 gap-4">
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
                  aria-invalid={!!field.state.meta.errors}
                  id="itemLevel"
                  max={MAX_LEVEL}
                  min={MIN_LEVEL}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  type="number"
                  value={field.state.value}
                />
                {field.state.meta.errors && (
                  <div
                    className="text-destructive text-sm"
                    id="itemLevel-error"
                  >
                    {field.state.meta.errors}
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
                    {Object.keys(rarityFactors).map((rarity) => (
                      <SelectItem key={rarity} value={rarity}>
                        {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.state.meta.errors && (
                  <div className="text-destructive text-sm">
                    {field.state.meta.errors}
                  </div>
                )}
              </div>
            )}
          </form.Field>
        </div>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button disabled={!canSubmit || isSubmitting} type="submit">
              {isSubmitting ? "..." : "Oblicz"}
            </Button>
          )}
        </form.Subscribe>
      </form>
      {result && (
        <div className="mt-4 w-[550px] space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">
              Ilość potrzebna do ulepszenia przedmiotu o poziomie{" "}
              {form.state.values.itemLevel} ({form.state.values.itemRarity}):
            </h3>
            <ul className="list-inside list-disc">
              {result.differentialCosts.map((cost: number, index: number) => (
                <li
                  key={`upgrade-cost-${form.state.values.itemLevel}-${form.state.values.itemRarity}-${cost}`}
                >
                  +{index + 1}: {cost.toLocaleString()} punktów ulepszenia
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Ekstrakcja:</h3>
            <p>
              Normalna (75%): {result.total75Percent.toLocaleString()} punktów
              ulepszenia
            </p>
            <p>
              Całkowita (100%): {result.totalUpgradeCost.toLocaleString()}{" "}
              punktów ulepszenia
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

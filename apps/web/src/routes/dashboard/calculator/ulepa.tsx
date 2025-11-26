import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Sparkles, TrendingUp } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Rarity = "zwykły" | "unikatowy" | "heroiczny" | "ulepszony" | "legendarny";

type RarityFactor = {
  upgradeRarityFactor: number;
  upgradeGoldFactor: number;
};

/**
 * Game constants for upgrade calculations
 * Values are derived from game mechanics
 */
const GAME_CONSTANTS = {
  ENHANCED_LEVEL_MULTIPLIER: 150,
  ENHANCED_BASE_COST: 27_000,
  STANDARD_BASE_COST: 180,
  EXTRACTION_RATE: 0.75,
  DEFAULT_ITEM_LEVEL: 280,
} as const;

const rarityFactors: Record<Rarity, RarityFactor> = {
  zwykły: { upgradeRarityFactor: 1, upgradeGoldFactor: 1 },
  unikatowy: { upgradeRarityFactor: 10, upgradeGoldFactor: 10 },
  heroiczny: { upgradeRarityFactor: 100, upgradeGoldFactor: 30 },
  ulepszony: { upgradeRarityFactor: -1, upgradeGoldFactor: 40 },
  legendarny: { upgradeRarityFactor: 1000, upgradeGoldFactor: 60 },
};

const rarityColors: Record<Rarity, string> = {
  zwykły: "text-gray-400",
  unikatowy: "text-yellow-500",
  heroiczny: "text-blue-500",
  ulepszony: "text-red-500",
  legendarny: "text-orange-500",
};

const rarityBgColors: Record<Rarity, string> = {
  zwykły: "bg-gray-500/10 border-gray-500/20",
  unikatowy: "bg-yellow-500/10 border-yellow-500/20",
  heroiczny: "bg-blue-500/10 border-blue-500/20",
  ulepszony: "bg-red-500/10 border-red-500/20",
  legendarny: "bg-orange-500/10 border-orange-500/20",
};

/** Multipliers for each upgrade level (1-5) - index 0 is unused */
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

/**
 * Formats gold amount in compact notation
 */
const formatGold = (amount: number): string => {
  const value = Math.floor(amount);
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}mld`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}m`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}k`;
  }
  return value.toLocaleString("pl-PL");
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
      cost =
        upgradeLevelFactors[n] *
        (GAME_CONSTANTS.ENHANCED_LEVEL_MULTIPLIER * level +
          GAME_CONSTANTS.ENHANCED_BASE_COST);
    } else {
      cost =
        factors.upgradeRarityFactor *
        upgradeLevelFactors[n] *
        (GAME_CONSTANTS.STANDARD_BASE_COST + level);
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
  staticData: {
    crumb: "Kalkulator ulepy",
  },
});

function RouteComponent() {
  const [result, setResult] = useState<{
    differentialCosts: number[];
    cumulativeCosts: number[];
    totalUpgradeCost: number;
    total75Percent: number;
    upgradeGoldCost: number;
    extractionGoldCost: number;
    itemLevel: number;
    itemRarity: Rarity;
  } | null>(null);

  const form = useForm({
    defaultValues: {
      itemLevel: GAME_CONSTANTS.DEFAULT_ITEM_LEVEL as number,
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
      const total75Percent = totalUpgradeCost * GAME_CONSTANTS.EXTRACTION_RATE;
      // Gold cost for upgrading to +5: (10 * lvl + 1300) * lvl * upgrade_gold_factor
      const upgradeGoldCost =
        (10 * value.itemLevel + 1300) *
        value.itemLevel *
        rarityFactors[value.itemRarity].upgradeGoldFactor;
      // Extraction gold cost: 60 * total_upgrade_points (based on 100% points invested)
      const extractionGoldCost = 60 * totalUpgradeCost;
      setResult({
        differentialCosts,
        cumulativeCosts: upgradeCosts,
        totalUpgradeCost,
        total75Percent,
        upgradeGoldCost,
        extractionGoldCost,
        itemLevel: value.itemLevel,
        itemRarity: value.itemRarity,
      });
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="mb-2 font-bold text-2xl tracking-tight">
          Kalkulator ulepy
        </h1>
        <p className="text-muted-foreground">
          Oblicz koszty ulepszenia przedmiotu na podstawie poziomu i rzadkości.
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
                        {(Object.keys(rarityFactors) as Rarity[]).map(
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
                    {isSubmitting ? "Obliczanie..." : "Oblicz koszty"}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </CardContent>
        </Card>

        {/* Extraction Results Card */}
        {result && (
          <Card className={`border-2 ${rarityBgColors[result.itemRarity]}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles
                  className={`h-5 w-5 ${rarityColors[result.itemRarity]}`}
                />
                Ekstrakcja
              </CardTitle>
              <CardDescription>
                Punkty ulepszenia możliwe do odzyskania
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <span className="text-muted-foreground text-sm">
                    Normalna ekstrakcja (75%)
                  </span>
                  <span className="font-semibold text-lg">
                    {Math.floor(result.total75Percent).toLocaleString("pl-PL")}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
                  <span className="font-medium text-sm">
                    Pełna ekstrakcja (100%)
                  </span>
                  <span className="font-bold text-lg text-primary">
                    {Math.floor(result.totalUpgradeCost).toLocaleString(
                      "pl-PL"
                    )}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 border-t pt-4">
                <div className="flex items-center justify-between rounded-lg bg-yellow-500/10 p-3">
                  <span className="text-muted-foreground text-sm">
                    Koszt ulepszenia do +5
                  </span>
                  <span className="font-semibold text-lg text-yellow-600">
                    {formatGold(result.upgradeGoldCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-yellow-500/10 p-3">
                  <span className="text-muted-foreground text-sm">
                    Koszt ekstrakcji
                  </span>
                  <span className="font-semibold text-lg text-yellow-600">
                    {formatGold(result.extractionGoldCost)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upgrade Costs Table */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Koszty ulepszenia
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Poziom</TableHead>
                  <TableHead>Koszt (per poziom)</TableHead>
                  <TableHead>Łącznie (kumulatywnie)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.differentialCosts.map((cost, idx) => {
                  const level = idx + 1;
                  return (
                    <TableRow key={`upgrade-level-${level}`}>
                      <TableCell>
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
                          +{level}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {Math.floor(cost).toLocaleString("pl-PL")} pkt
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {Math.floor(result.cumulativeCosts[idx]).toLocaleString(
                          "pl-PL"
                        )}{" "}
                        pkt
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="border-t-2 bg-muted/30">
                  <TableCell>
                    <span className="font-semibold">Suma</span>
                  </TableCell>
                  <TableCell className="font-bold text-primary">
                    {Math.floor(result.totalUpgradeCost).toLocaleString(
                      "pl-PL"
                    )}{" "}
                    pkt
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

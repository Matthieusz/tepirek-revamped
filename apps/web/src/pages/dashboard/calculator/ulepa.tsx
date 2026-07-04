import { useForm } from "@tanstack/react-form";
import * as Schema from "effect/Schema";
import { Calculator, Sparkles, TrendingUp } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ULEPA_DEFAULT_ITEM_LEVEL,
  ULEPA_RARITIES,
  calculateUpgradeSummary,
  formatGold,
} from "@/lib/calculators/ulepa";
import type { UlepaRarity } from "@/lib/calculators/ulepa";
import type { AuthSession } from "@/types/route";

type Rarity = UlepaRarity;

const MIN_LEVEL = 1;
const MAX_LEVEL = 300;

const rarityColors: Record<Rarity, string> = {
  heroiczny: "text-blue-500",
  legendarny: "text-orange-500",
  ulepszony: "text-red-500",
  unikatowy: "text-yellow-500",
  zwykły: "text-gray-400",
};

const rarityBgColors: Record<Rarity, string> = {
  heroiczny: "bg-blue-500/10 border-blue-500/20",
  legendarny: "bg-orange-500/10 border-orange-500/20",
  ulepszony: "bg-red-500/10 border-red-500/20",
  unikatowy: "bg-yellow-500/10 border-yellow-500/20",
  zwykły: "bg-gray-500/10 border-gray-500/20",
};

const ItemLevelSchema = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: MAX_LEVEL, minimum: MIN_LEVEL })
);
const ItemRaritySchema = Schema.Literals([
  "zwykły",
  "unikatowy",
  "heroiczny",
  "ulepszony",
  "legendarny",
]);
const formSchema = Schema.Struct({
  itemLevel: ItemLevelSchema,
  itemRarity: ItemRaritySchema,
});

interface CalculatorUlepaPageProps {
  session: AuthSession;
}

interface UlepaResult {
  cumulativeCosts: number[];
  differentialCosts: number[];
  extractionGoldCost: number;
  itemLevel: number;
  itemRarity: Rarity;
  total75Percent: number;
  totalUpgradeCost: number;
  upgradeGoldCost: number;
}

const UlepaResults = ({ result }: { result: UlepaResult }) => (
  <div
    className={`rounded-xl border-2 ${rarityBgColors[result.itemRarity]} bg-card p-6`}
  >
    <div className="mb-4">
      <h2 className="flex items-center gap-2 font-semibold text-base">
        <Sparkles className={`size-5 ${rarityColors[result.itemRarity]}`} />
        Ekstrakcja
      </h2>
      <p className="text-muted-foreground text-sm">
        Punkty ulepszenia możliwe do odzyskania
      </p>
    </div>
    <div className="space-y-4">
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
          <span className="font-medium text-sm">Pełna ekstrakcja (100%)</span>
          <span className="font-bold text-lg text-primary">
            {Math.floor(result.totalUpgradeCost).toLocaleString("pl-PL")}
          </span>
        </div>
      </div>
      <div className="grid gap-3 border-t border-border pt-4">
        <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
          <span className="text-muted-foreground text-sm">
            Koszt ulepszenia do +5
          </span>
          <span className="font-semibold text-lg text-primary">
            {formatGold(result.upgradeGoldCost)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
          <span className="text-muted-foreground text-sm">
            Koszt ekstrakcji
          </span>
          <span className="font-semibold text-lg text-primary">
            {formatGold(result.extractionGoldCost)}
          </span>
        </div>
      </div>
    </div>
  </div>
);

const UlepaCostsTable = ({ result }: { result: UlepaResult }) => (
  <div className="rounded-xl border border-border bg-card">
    <div className="border-b border-border p-6">
      <h2 className="flex items-center gap-2 font-semibold text-base">
        <TrendingUp className="size-5" />
        Koszty ulepszenia
      </h2>
      <p className="text-muted-foreground text-sm">
        Przedmiot poziom{" "}
        <span className="font-semibold">{result.itemLevel}</span> (
        <span className={`font-semibold ${rarityColors[result.itemRarity]}`}>
          {result.itemRarity}
        </span>
        )
      </p>
    </div>
    <div className="p-6">
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
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
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
              {Math.floor(result.totalUpgradeCost).toLocaleString("pl-PL")} pkt
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
);

export default function CalculatorUlepaPage(_props: CalculatorUlepaPageProps) {
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
      itemLevel: ULEPA_DEFAULT_ITEM_LEVEL,
      itemRarity: "legendarny",
    } satisfies typeof formSchema.Type,
    onSubmit: ({ value }) => {
      const summary = calculateUpgradeSummary(
        value.itemLevel,
        value.itemRarity
      );
      setResult({
        ...summary,
        itemLevel: value.itemLevel,
        itemRarity: value.itemRarity,
      });
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
          Kalkulator ulepy
        </h1>
        <p className="text-muted-foreground">
          Oblicz koszty ulepszenia przedmiotu na podstawie poziomu i rzadkości.
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
                          field.handleChange(val);
                        }
                      }}
                      value={field.state.value}
                    >
                      <SelectTrigger id="itemRarity">
                        <SelectValue placeholder="Wybierz rzadkość" />
                      </SelectTrigger>
                      <SelectContent>
                        {ULEPA_RARITIES.map((rarity) => (
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
                    {isSubmitting ? "Obliczanie..." : "Oblicz koszty"}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </div>
        </div>

        {/* Extraction Results */}
        {result && <UlepaResults result={result} />}
      </div>

      {/* Upgrade Costs Table */}
      {result && <UlepaCostsTable result={result} />}
    </div>
  );
}

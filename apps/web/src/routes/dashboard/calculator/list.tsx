import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calculator,
  Shield,
  Skull,
  Swords,
  User,
  Users,
} from "lucide-react";
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

const MIN_LEVEL = 1;
const MAX_LEVEL = 500;

/**
 * Calculates minimum level difference required to avoid penalty points
 * Formula: min_lvl_difference = 16 + max(0, (lvl_player - 100) / 5)
 */
const calculateMinLevelDifference = (attackerLevel: number): number =>
  16 + Math.max(0, (attackerLevel - 100) / 5);

/**
 * Checks if attacker would receive penalty points for killing a lower level player
 */
const wouldReceivePenalty = (
  attackerLevel: number,
  victimLevel: number
): boolean => {
  const minDiff = calculateMinLevelDifference(attackerLevel);
  const actualDiff = attackerLevel - victimLevel;
  return actualDiff >= minDiff;
};

/**
 * Calculates the minimum victim level that would give penalty points
 */
const calculateMinVictimLevelForPenalty = (attackerLevel: number): number => {
  const minDiff = calculateMinLevelDifference(attackerLevel);
  return Math.ceil(attackerLevel - minDiff);
};

/**
 * Calculates the maximum attacker level that can attack without penalty
 */
const calculateMaxAttackerLevelWithoutPenalty = (
  victimLevel: number
): number => {
  // We need to find max attackerLevel where:
  // attackerLevel - victimLevel < 16 + max(0, (attackerLevel - 100) / 5)
  // This requires solving iteratively since attackerLevel appears on both sides
  let maxLevel = victimLevel;
  for (let lvl = victimLevel; lvl <= MAX_LEVEL; lvl++) {
    const minDiff = calculateMinLevelDifference(lvl);
    if (lvl - victimLevel < minDiff) {
      maxLevel = lvl;
    } else {
      break;
    }
  }
  return maxLevel;
};

/**
 * Calculates group attack penalty check
 * Formula: 0.5 * (max_lvl_attackers + avg_lvl_attackers) - avg_lvl_defenders > 15 + max(0, 0.1 * (max_lvl_attackers + avg_lvl_attackers) - 20)
 *
 * @param attackerLevels - array of attacker levels
 * @param defenderLevels - array of defender levels
 * @returns object with calculation details and penalty result
 */
const calculateGroupAttackPenalty = (
  attackerLevels: number[],
  defenderLevels: number[]
): {
  maxAttackerLevel: number;
  avgAttackerLevel: number;
  avgDefenderLevel: number;
  attackerStrength: number;
  threshold: number;
  difference: number;
  wouldReceivePenalty: boolean;
} => {
  const maxAttackerLevel = Math.max(...attackerLevels);
  const avgAttackerLevel =
    attackerLevels.reduce((sum, lvl) => sum + lvl, 0) / attackerLevels.length;
  const avgDefenderLevel =
    defenderLevels.reduce((sum, lvl) => sum + lvl, 0) / defenderLevels.length;

  // Left side of inequality: 0.5 * (max + avg_attackers) - avg_defenders
  const attackerStrength = maxAttackerLevel + avgAttackerLevel;
  const difference = 0.5 * attackerStrength - avgDefenderLevel;

  // Right side of inequality: 15 + max(0, 0.1 * (max + avg_attackers) - 20)
  const threshold = 15 + Math.max(0, 0.1 * attackerStrength - 20);

  return {
    maxAttackerLevel,
    avgAttackerLevel,
    avgDefenderLevel,
    attackerStrength,
    threshold,
    difference,
    wouldReceivePenalty: difference > threshold,
  };
};

/**
 * Parse comma-separated levels string into array of numbers
 */
const parseLevels = (input: string): number[] =>
  input
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= MIN_LEVEL && n <= MAX_LEVEL);

const formSchema = z.object({
  attackerLevel: z
    .number()
    .int({ message: "Musi być liczbą całkowitą" })
    .min(MIN_LEVEL, { message: `Min: ${MIN_LEVEL}` })
    .max(MAX_LEVEL, { message: `Max: ${MAX_LEVEL}` }),
  victimLevel: z
    .number()
    .int({ message: "Musi być liczbą całkowitą" })
    .min(MIN_LEVEL, { message: `Min: ${MIN_LEVEL}` })
    .max(MAX_LEVEL, { message: `Max: ${MAX_LEVEL}` }),
});

const groupFormSchema = z.object({
  attackerLevels: z
    .string()
    .min(1, { message: "Wprowadź poziomy atakujących" }),
  defenderLevels: z.string().min(1, { message: "Wprowadź poziomy obrońców" }),
});

export const Route = createFileRoute("/dashboard/calculator/list")({
  component: RouteComponent,
  staticData: {
    crumb: "Listy gończe",
  },
});

function RouteComponent() {
  const [mode, setMode] = useState<"single" | "group">("single");

  const [result, setResult] = useState<{
    attackerLevel: number;
    victimLevel: number;
    minLevelDifference: number;
    actualDifference: number;
    wouldReceivePenalty: boolean;
    minVictimLevelForPenalty: number;
    maxAttackerWithoutPenalty: number;
  } | null>(null);

  const [groupResult, setGroupResult] = useState<{
    attackerLevels: number[];
    defenderLevels: number[];
    maxAttackerLevel: number;
    avgAttackerLevel: number;
    avgDefenderLevel: number;
    attackerStrength: number;
    threshold: number;
    difference: number;
    wouldReceivePenalty: boolean;
  } | null>(null);

  const form = useForm({
    defaultValues: {
      attackerLevel: 200 as number,
      victimLevel: 150 as number,
    },
    onSubmit: ({ value }) => {
      const minLevelDifference = calculateMinLevelDifference(
        value.attackerLevel
      );
      const actualDifference = value.attackerLevel - value.victimLevel;
      const penalty = wouldReceivePenalty(
        value.attackerLevel,
        value.victimLevel
      );
      const minVictimLevelForPenalty = calculateMinVictimLevelForPenalty(
        value.attackerLevel
      );
      const maxAttackerWithoutPenalty = calculateMaxAttackerLevelWithoutPenalty(
        value.victimLevel
      );

      setResult({
        attackerLevel: value.attackerLevel,
        victimLevel: value.victimLevel,
        minLevelDifference,
        actualDifference,
        wouldReceivePenalty: penalty,
        minVictimLevelForPenalty,
        maxAttackerWithoutPenalty,
      });
    },
  });

  const groupForm = useForm({
    defaultValues: {
      attackerLevels: "200, 180, 160" as string,
      defenderLevels: "150, 140" as string,
    },
    onSubmit: ({ value }) => {
      const attackerLevels = parseLevels(value.attackerLevels);
      const defenderLevels = parseLevels(value.defenderLevels);

      if (attackerLevels.length === 0 || defenderLevels.length === 0) {
        return;
      }

      const groupCalc = calculateGroupAttackPenalty(
        attackerLevels,
        defenderLevels
      );

      setGroupResult({
        attackerLevels,
        defenderLevels,
        ...groupCalc,
      });
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="mb-2 font-bold text-2xl tracking-tight">
          Kalkulator listów gończych
        </h1>
        <p className="text-muted-foreground">
          Sprawdź czy za zabicie gracza otrzymasz punkt karny.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 rounded-lg bg-muted p-1">
        <Button
          className="flex-1"
          onClick={() => setMode("single")}
          size="sm"
          variant={mode === "single" ? "default" : "ghost"}
        >
          <User className="mr-2 h-4 w-4" />
          Walka 1v1
        </Button>
        <Button
          className="flex-1"
          onClick={() => setMode("group")}
          size="sm"
          variant={mode === "group" ? "default" : "ghost"}
        >
          <Users className="mr-2 h-4 w-4" />
          Walka grupowa
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Single Mode */}
        {mode === "single" && (
          <>
            {/* Input Form Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Parametry walki
                </CardTitle>
                <CardDescription>
                  Wprowadź poziomy atakującego i ofiary
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
                    name="attackerLevel"
                    validators={{
                      onChange: ({ value }) => {
                        const parsed =
                          formSchema.shape.attackerLevel.safeParse(value);
                        return parsed.success
                          ? undefined
                          : parsed.error.issues[0]?.message;
                      },
                    }}
                  >
                    {(field) => (
                      <div className="space-y-2">
                        <Label
                          className="flex items-center gap-2"
                          htmlFor="attackerLevel"
                        >
                          <Swords className="h-4 w-4 text-red-500" />
                          Poziom atakującego
                        </Label>
                        <Input
                          aria-describedby="attackerLevel-error"
                          aria-invalid={
                            field.state.meta.errors &&
                            field.state.meta.errors.length > 0
                          }
                          id="attackerLevel"
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
                              id="attackerLevel-error"
                            >
                              {field.state.meta.errors[0]}
                            </div>
                          )}
                      </div>
                    )}
                  </form.Field>
                  <form.Field
                    name="victimLevel"
                    validators={{
                      onChange: ({ value }) => {
                        const parsed =
                          formSchema.shape.victimLevel.safeParse(value);
                        return parsed.success
                          ? undefined
                          : parsed.error.issues[0]?.message;
                      },
                    }}
                  >
                    {(field) => (
                      <div className="space-y-2">
                        <Label
                          className="flex items-center gap-2"
                          htmlFor="victimLevel"
                        >
                          <Skull className="h-4 w-4 text-muted-foreground" />
                          Poziom ofiary
                        </Label>
                        <Input
                          aria-describedby="victimLevel-error"
                          aria-invalid={
                            field.state.meta.errors &&
                            field.state.meta.errors.length > 0
                          }
                          id="victimLevel"
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
                              id="victimLevel-error"
                            >
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
                        {isSubmitting ? "Obliczanie..." : "Sprawdź"}
                      </Button>
                    )}
                  </form.Subscribe>
                </form>
              </CardContent>
            </Card>

            {/* Result Card */}
            {result && (
              <Card
                className={`border-2 ${
                  result.wouldReceivePenalty
                    ? "border-red-500/50 bg-red-500/5"
                    : "border-green-500/50 bg-green-500/5"
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {result.wouldReceivePenalty ? (
                      <>
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span className="text-red-500">
                          Otrzymasz punkt karny!
                        </span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5 text-green-500" />
                        <span className="text-green-500">
                          Brak punktu karnego
                        </span>
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-muted-foreground text-sm">
                        Różnica poziomów
                      </span>
                      <span className="font-semibold text-lg">
                        {result.actualDifference} lvl
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-muted-foreground text-sm">
                        Wymagana różnica (min)
                      </span>
                      <span className="font-semibold text-lg">
                        {result.minLevelDifference.toFixed(1)} lvl
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 border-t pt-4">
                    <div className="text-muted-foreground text-sm">
                      <Users className="mr-1 mb-1 inline h-4 w-4" />
                      Przydatne informacje:
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-yellow-500/10 p-3">
                      <span className="text-muted-foreground text-sm">
                        Min. poziom ofiary dla kary (lvl {result.attackerLevel})
                      </span>
                      <span className="font-semibold text-yellow-600">
                        ≤ {result.minVictimLevelForPenalty} lvl
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-blue-500/10 p-3">
                      <span className="text-muted-foreground text-sm">
                        Max. atakujący bez kary (lvl {result.victimLevel})
                      </span>
                      <span className="font-semibold text-blue-600">
                        ≤ {result.maxAttackerWithoutPenalty} lvl
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Group Mode */}
        {mode === "group" && (
          <>
            {/* Group Input Form Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Parametry walki grupowej
                </CardTitle>
                <CardDescription>
                  Wprowadź poziomy członków drużyn (oddzielone przecinkami)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="grid gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    groupForm.handleSubmit();
                  }}
                >
                  <groupForm.Field
                    name="attackerLevels"
                    validators={{
                      onChange: ({ value }) => {
                        const parsed =
                          groupFormSchema.shape.attackerLevels.safeParse(value);
                        if (!parsed.success) {
                          return parsed.error.issues[0]?.message;
                        }
                        const levels = parseLevels(value);
                        if (levels.length === 0) {
                          return "Wprowadź co najmniej jeden poprawny poziom";
                        }
                      },
                    }}
                  >
                    {(field) => (
                      <div className="space-y-2">
                        <Label
                          className="flex items-center gap-2"
                          htmlFor="attackerLevels"
                        >
                          <Swords className="h-4 w-4 text-red-500" />
                          Poziomy atakujących
                        </Label>
                        <Input
                          aria-describedby="attackerLevels-error"
                          aria-invalid={
                            field.state.meta.errors &&
                            field.state.meta.errors.length > 0
                          }
                          id="attackerLevels"
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="np. 200, 180, 160"
                          type="text"
                          value={field.state.value}
                        />
                        {field.state.meta.errors &&
                          field.state.meta.errors.length > 0 && (
                            <div
                              className="text-destructive text-sm"
                              id="attackerLevels-error"
                            >
                              {field.state.meta.errors[0]}
                            </div>
                          )}
                      </div>
                    )}
                  </groupForm.Field>
                  <groupForm.Field
                    name="defenderLevels"
                    validators={{
                      onChange: ({ value }) => {
                        const parsed =
                          groupFormSchema.shape.defenderLevels.safeParse(value);
                        if (!parsed.success) {
                          return parsed.error.issues[0]?.message;
                        }
                        const levels = parseLevels(value);
                        if (levels.length === 0) {
                          return "Wprowadź co najmniej jeden poprawny poziom";
                        }
                      },
                    }}
                  >
                    {(field) => (
                      <div className="space-y-2">
                        <Label
                          className="flex items-center gap-2"
                          htmlFor="defenderLevels"
                        >
                          <Shield className="h-4 w-4 text-blue-500" />
                          Poziomy obrońców
                        </Label>
                        <Input
                          aria-describedby="defenderLevels-error"
                          aria-invalid={
                            field.state.meta.errors &&
                            field.state.meta.errors.length > 0
                          }
                          id="defenderLevels"
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="np. 150, 140"
                          type="text"
                          value={field.state.value}
                        />
                        {field.state.meta.errors &&
                          field.state.meta.errors.length > 0 && (
                            <div
                              className="text-destructive text-sm"
                              id="defenderLevels-error"
                            >
                              {field.state.meta.errors[0]}
                            </div>
                          )}
                      </div>
                    )}
                  </groupForm.Field>
                  <groupForm.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                  >
                    {([canSubmit, isSubmitting]) => (
                      <Button
                        className="w-full"
                        disabled={!canSubmit || isSubmitting}
                        type="submit"
                      >
                        {isSubmitting ? "Obliczanie..." : "Sprawdź"}
                      </Button>
                    )}
                  </groupForm.Subscribe>
                </form>
              </CardContent>
            </Card>

            {/* Group Result Card */}
            {groupResult && (
              <Card
                className={`border-2 ${
                  groupResult.wouldReceivePenalty
                    ? "border-red-500/50 bg-red-500/5"
                    : "border-green-500/50 bg-green-500/5"
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {groupResult.wouldReceivePenalty ? (
                      <>
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span className="text-red-500">
                          Drużyna otrzyma punkty karne!
                        </span>
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5 text-green-500" />
                        <span className="text-green-500">
                          Brak punktów karnych
                        </span>
                      </>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Atakujący: {groupResult.attackerLevels.length} | Obrońcy:{" "}
                    {groupResult.defenderLevels.length}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-muted-foreground text-sm">
                        Max lvl atakujących
                      </span>
                      <span className="font-semibold text-lg">
                        {groupResult.maxAttackerLevel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-muted-foreground text-sm">
                        Średnia lvl atakujących
                      </span>
                      <span className="font-semibold text-lg">
                        {groupResult.avgAttackerLevel.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <span className="text-muted-foreground text-sm">
                        Średnia lvl obrońców
                      </span>
                      <span className="font-semibold text-lg">
                        {groupResult.avgDefenderLevel.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 border-t pt-4">
                    <div className="flex items-center justify-between rounded-lg bg-yellow-500/10 p-3">
                      <span className="text-muted-foreground text-sm">
                        Różnica (lewa strona)
                      </span>
                      <span className="font-semibold text-yellow-600">
                        {groupResult.difference.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-blue-500/10 p-3">
                      <span className="text-muted-foreground text-sm">
                        Próg (prawa strona)
                      </span>
                      <span className="font-semibold text-blue-600">
                        {groupResult.threshold.toFixed(1)}
                      </span>
                    </div>
                    <div
                      className={`flex items-center justify-between rounded-lg p-3 ${
                        groupResult.wouldReceivePenalty
                          ? "bg-red-500/10"
                          : "bg-green-500/10"
                      }`}
                    >
                      <span className="text-muted-foreground text-sm">
                        Wynik: {groupResult.difference.toFixed(1)} {">"}{" "}
                        {groupResult.threshold.toFixed(1)}
                      </span>
                      <span
                        className={`font-semibold ${
                          groupResult.wouldReceivePenalty
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {groupResult.wouldReceivePenalty ? "TAK" : "NIE"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Zasady listów gończych
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground text-sm">
          {mode === "single" ? (
            <p>
              <strong>Formuła (1v1):</strong>{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                min_lvl_difference = 16 + max(0, (lvl_player - 100) / 5)
              </code>
            </p>
          ) : (
            <p>
              <strong>Formuła (grupa):</strong>{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                0.5 × (max_atk + śrd_atk) - śrd_def {">"} 15 + max(0, 0.1 ×
                (max_atk + śrd_atk) - 20)
              </code>
            </p>
          )}
          <ul className="list-inside list-disc space-y-1">
            <li>
              Punkty karne są naliczane tylko dla{" "}
              <strong>atakującej postaci</strong>
            </li>
            <li>
              Punkty karne <strong>nie są naliczane</strong> podczas wojny
              klanowej (min. 3h)
            </li>
            <li>
              Punkty karne <strong>nie są naliczane</strong> jeśli ofiara jest
              poszukiwana
            </li>
            <li>
              Punkty karne <strong>nie są naliczane</strong> na mapach z bonusem
              przewagi poziomowej
            </li>
            <li>
              Punkty karne <strong>nie są naliczane</strong> na Otchłani
            </li>
            <li>
              Liczba punktów karnych maleje o <strong>2 co 5:25</strong> na dobę
            </li>
            <li>
              Do listy gończej trafiasz przy{" "}
              <strong>30 punktach karnych</strong>
            </li>
            <li>
              Poszukiwani gracze tracą <strong>1% złota</strong> za przegraną
              walkę
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

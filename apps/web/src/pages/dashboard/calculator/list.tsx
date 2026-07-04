import { useForm } from "@tanstack/react-form";
import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
  ReactFormExtendedApi,
} from "@tanstack/react-form";
import * as Schema from "effect/Schema";
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_LEVEL,
  MIN_LEVEL,
  calculateGroupAttackPenalty,
  calculateMaxAttackerLevelWithoutPenalty,
  calculateMinLevelDifference,
  calculateMinVictimLevelForPenalty,
  parseLevels,
  wouldReceivePenalty,
} from "@/lib/calculators/bounty";
import type {
  GroupPenaltyResult,
  SinglePenaltyResult,
} from "@/lib/calculators/bounty";
import type { AuthSession } from "@/types/route";

const LevelSchema = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: MAX_LEVEL, minimum: MIN_LEVEL })
);
const formSchema = Schema.Struct({
  attackerLevel: LevelSchema,
  victimLevel: LevelSchema,
});

const NonEmptyLevelsSchema = Schema.NonEmptyString;
const groupFormSchema = Schema.Struct({
  attackerLevels: NonEmptyLevelsSchema,
  defenderLevels: NonEmptyLevelsSchema,
});

interface SingleFormValues {
  attackerLevel: number;
  victimLevel: number;
}

interface GroupFormValues {
  attackerLevels: string;
  defenderLevels: string;
}

/**
 * Concrete form types inferred from each `useForm` call below. Validator slots
 * use the library's permissive option types so the inferred form (which
 * defaults those slots to `FormValidateOrFn | undefined`) stays assignable.
 * Typing the prop with the real form-data shape keeps `form.Field`/
 * `form.Subscribe` fully typed instead of forcing `unknown`.
 */
type SingleForm = ReactFormExtendedApi<
  SingleFormValues,
  FormValidateOrFn<SingleFormValues> | undefined,
  FormValidateOrFn<SingleFormValues> | undefined,
  FormAsyncValidateOrFn<SingleFormValues> | undefined,
  FormValidateOrFn<SingleFormValues> | undefined,
  FormAsyncValidateOrFn<SingleFormValues> | undefined,
  FormValidateOrFn<SingleFormValues> | undefined,
  FormAsyncValidateOrFn<SingleFormValues> | undefined,
  FormValidateOrFn<SingleFormValues> | undefined,
  FormAsyncValidateOrFn<SingleFormValues> | undefined,
  FormAsyncValidateOrFn<SingleFormValues> | undefined,
  unknown
>;

type GroupForm = ReactFormExtendedApi<
  GroupFormValues,
  FormValidateOrFn<GroupFormValues> | undefined,
  FormValidateOrFn<GroupFormValues> | undefined,
  FormAsyncValidateOrFn<GroupFormValues> | undefined,
  FormValidateOrFn<GroupFormValues> | undefined,
  FormAsyncValidateOrFn<GroupFormValues> | undefined,
  FormValidateOrFn<GroupFormValues> | undefined,
  FormAsyncValidateOrFn<GroupFormValues> | undefined,
  FormValidateOrFn<GroupFormValues> | undefined,
  FormAsyncValidateOrFn<GroupFormValues> | undefined,
  FormAsyncValidateOrFn<GroupFormValues> | undefined,
  unknown
>;

const SingleMode = ({
  form,
  result,
}: {
  form: SingleForm;
  result: SinglePenaltyResult | null;
}) => (
  <>
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-6">
        <h2 className="flex items-center gap-2 font-semibold text-base">
          <Calculator className="size-5" />
          Parametry walki
        </h2>
        <p className="text-muted-foreground text-sm">
          Wprowadź poziomy atakującego i przeciwnika
        </p>
      </div>
      <div className="p-6">
        <form
          className="mt-2 grid gap-4"
          action={async () => {
            await form.handleSubmit();
          }}
        >
          <form.Field
            name="attackerLevel"
            validators={{
              onChange: ({ value }) =>
                Schema.is(LevelSchema)(value)
                  ? undefined
                  : `Podaj liczbę całkowitą od ${MIN_LEVEL} do ${MAX_LEVEL}`,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label
                  className="flex items-center gap-2"
                  htmlFor="attackerLevel"
                >
                  <Swords className="size-4 text-muted-foreground" />
                  Poziom atakującego
                </Label>
                <Input
                  aria-describedby="attackerLevel-error"
                  aria-invalid={field.state.meta.errors.length > 0}
                  id="attackerLevel"
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
              onChange: ({ value }) =>
                Schema.is(LevelSchema)(value)
                  ? undefined
                  : `Podaj liczbę całkowitą od ${MIN_LEVEL} do ${MAX_LEVEL}`,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label
                  className="flex items-center gap-2"
                  htmlFor="victimLevel"
                >
                  <Skull className="size-4 text-muted-foreground" />
                  Poziom ofiary
                </Label>
                <Input
                  aria-describedby="victimLevel-error"
                  aria-invalid={field.state.meta.errors.length > 0}
                  id="victimLevel"
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
      </div>
    </div>

    {result && (
      <div
        className={`rounded-xl border-2 ${
          result.wouldReceivePenalty
            ? "border-destructive/50 bg-destructive/5"
            : "border-primary/50 bg-primary/5"
        } bg-card p-6`}
      >
        <div className="mb-4">
          <h2 className="flex items-center gap-2 font-semibold text-base">
            {result.wouldReceivePenalty ? (
              <>
                <AlertTriangle className="size-5 text-destructive" />
                <span className="text-destructive">Otrzymasz punkt karny!</span>
              </>
            ) : (
              <>
                <Shield className="size-5 text-primary" />
                <span className="text-primary">Brak punktu karnego</span>
              </>
            )}
          </h2>
        </div>
        <div className="space-y-4">
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

          <div className="grid gap-3 border-t border-border pt-4">
            <div className="text-muted-foreground text-sm">
              <Users className="mr-1 mb-1 inline size-4" />
              Przydatne informacje:
            </div>
            <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
              <span className="text-muted-foreground text-sm">
                Min. poziom ofiary dla kary (lvl {result.attackerLevel})
              </span>
              <span className="font-semibold text-primary">
                ≤ {result.minVictimLevelForPenalty} lvl
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-muted-foreground text-sm">
                Max. atakujący bez kary (lvl {result.victimLevel})
              </span>
              <span className="font-semibold">
                ≤ {result.maxAttackerWithoutPenalty} lvl
              </span>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);

const GroupMode = ({
  form,
  result,
}: {
  form: GroupForm;
  result: GroupPenaltyResult | null;
}) => (
  <>
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-6">
        <h2 className="flex items-center gap-2 font-semibold text-base">
          <Calculator className="size-5" />
          Parametry walki grupowej
        </h2>
        <p className="text-muted-foreground text-sm">
          Wprowadź poziomy członków drużyn (oddzielone przecinkami)
        </p>
      </div>
      <div className="p-6">
        <form
          className="mt-2 grid gap-4"
          action={async () => {
            await form.handleSubmit();
          }}
        >
          <form.Field
            name="attackerLevels"
            validators={{
              onChange: ({ value }) => {
                if (!Schema.is(NonEmptyLevelsSchema)(value)) {
                  return "Wprowadź poziomy atakujących";
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
                  <Swords className="size-4 text-muted-foreground" />
                  Poziomy atakujących
                </Label>
                <Input
                  aria-describedby="attackerLevels-error"
                  aria-invalid={field.state.meta.errors.length > 0}
                  id="attackerLevels"
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                  }}
                  placeholder="np. 200, 180, 160"
                  type="text"
                  value={field.state.value}
                />
                {field.state.meta.errors.length > 0 && (
                  <div
                    className="text-destructive text-sm"
                    id="attackerLevels-error"
                  >
                    {field.state.meta.errors[0]}
                  </div>
                )}
              </div>
            )}
          </form.Field>
          <form.Field
            name="defenderLevels"
            validators={{
              onChange: ({ value }) => {
                if (!Schema.is(NonEmptyLevelsSchema)(value)) {
                  return "Wprowadź poziomy obrońców";
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
                  <Shield className="size-4 text-muted-foreground" />
                  Poziomy obrońców
                </Label>
                <Input
                  aria-describedby="defenderLevels-error"
                  aria-invalid={field.state.meta.errors.length > 0}
                  id="defenderLevels"
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                  }}
                  placeholder="np. 150, 140"
                  type="text"
                  value={field.state.value}
                />
                {field.state.meta.errors.length > 0 && (
                  <div
                    className="text-destructive text-sm"
                    id="defenderLevels-error"
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
      </div>
    </div>

    {result && (
      <div
        className={`rounded-xl border-2 ${
          result.wouldReceivePenalty
            ? "border-destructive/50 bg-destructive/5"
            : "border-primary/50 bg-primary/5"
        } bg-card p-6`}
      >
        <div className="mb-4">
          <h2 className="flex items-center gap-2 font-semibold text-base">
            {result.wouldReceivePenalty ? (
              <>
                <AlertTriangle className="size-5 text-destructive" />
                <span className="text-destructive">
                  Drużyna otrzyma punkty karne!
                </span>
              </>
            ) : (
              <>
                <Shield className="size-5 text-primary" />
                <span className="text-primary">Brak punktów karnych</span>
              </>
            )}
          </h2>
          <p className="text-muted-foreground text-sm">
            Atakujący: {result.attackerLevels.length} | Obrońcy:{" "}
            {result.defenderLevels.length}
          </p>
        </div>
        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-muted-foreground text-sm">
                Max lvl atakujących
              </span>
              <span className="font-semibold text-lg">
                {result.maxAttackerLevel}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-muted-foreground text-sm">
                Średnia lvl atakujących
              </span>
              <span className="font-semibold text-lg">
                {result.avgAttackerLevel.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-muted-foreground text-sm">
                Średnia lvl obrońców
              </span>
              <span className="font-semibold text-lg">
                {result.avgDefenderLevel.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 border-t border-border pt-4">
            <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
              <span className="text-muted-foreground text-sm">
                Różnica (lewa strona)
              </span>
              <span className="font-semibold text-primary">
                {result.difference.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-muted-foreground text-sm">
                Próg (prawa strona)
              </span>
              <span className="font-semibold">
                {result.threshold.toFixed(1)}
              </span>
            </div>
            <div
              className={`flex items-center justify-between rounded-lg p-3 ${
                result.wouldReceivePenalty
                  ? "bg-destructive/10"
                  : "bg-primary/10"
              }`}
            >
              <span className="text-muted-foreground text-sm">
                Wynik: {result.difference.toFixed(1)} {">"}{" "}
                {result.threshold.toFixed(1)}
              </span>
              <span
                className={`font-semibold ${
                  result.wouldReceivePenalty
                    ? "text-destructive"
                    : "text-primary"
                }`}
              >
                {result.wouldReceivePenalty ? "TAK" : "NIE"}
              </span>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);

interface CalculatorListPageProps {
  session: AuthSession;
}

export default function CalculatorListPage(_props: CalculatorListPageProps) {
  const [mode, setMode] = useState<"single" | "group">("single");

  const [result, setResult] = useState<SinglePenaltyResult | null>(null);

  const [groupResult, setGroupResult] = useState<GroupPenaltyResult | null>(
    null
  );

  const form = useForm({
    defaultValues: {
      attackerLevel: 200,
      victimLevel: 150,
    } satisfies typeof formSchema.Type,
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
        actualDifference,
        attackerLevel: value.attackerLevel,
        maxAttackerWithoutPenalty,
        minLevelDifference,
        minVictimLevelForPenalty,
        victimLevel: value.victimLevel,
        wouldReceivePenalty: penalty,
      });
    },
  });

  const groupForm = useForm({
    defaultValues: {
      attackerLevels: "200, 180, 160",
      defenderLevels: "150, 140",
    } satisfies typeof groupFormSchema.Type,
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
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
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
          onClick={() => {
            setMode("single");
          }}
          size="sm"
          variant={mode === "single" ? "default" : "ghost"}
        >
          <User className="mr-2 size-4" />
          Walka 1v1
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            setMode("group");
          }}
          size="sm"
          variant={mode === "group" ? "default" : "ghost"}
        >
          <Users className="mr-2 size-4" />
          Walka grupowa
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Single Mode */}
        {mode === "single" && <SingleMode form={form} result={result} />}

        {/* Group Mode */}
        {mode === "group" && (
          <GroupMode form={groupForm} result={groupResult} />
        )}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="flex items-center gap-2 font-semibold text-base">
            <AlertTriangle className="size-5 text-muted-foreground" />
            Zasady listów gończych
          </h2>
        </div>
        <div className="space-y-3 p-6 text-muted-foreground text-sm">
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
        </div>
      </div>
    </div>
  );
}

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { AlertTriangle, Calculator, Shield, User, Users } from "lucide-react";
import { useState } from "react";

import {
  EffectNumberField,
  EffectTextField,
} from "@/components/forms/effect-form-fields";
import { Button } from "@/components/ui/button";
import {
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
import {
  CalculatorLevelSchema,
  CalculatorLevelsSchema,
} from "@/lib/form-schemas";
import type { AuthSession } from "@/types/route";

const singleFormBuilder = FormBuilder.empty
  .addField("attackerLevel", CalculatorLevelSchema)
  .addField("victimLevel", CalculatorLevelSchema);

const groupFormBuilder = FormBuilder.empty
  .addField("attackerLevels", CalculatorLevelsSchema)
  .addField("defenderLevels", CalculatorLevelsSchema);

const SingleModeResult = ({ result }: { result: SinglePenaltyResult }) => (
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
);

const GroupModeResult = ({ result }: { result: GroupPenaltyResult }) => (
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
          <span className="font-semibold">{result.threshold.toFixed(1)}</span>
        </div>
        <div
          className={`flex items-center justify-between rounded-lg p-3 ${
            result.wouldReceivePenalty ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          <span className="text-muted-foreground text-sm">
            Wynik: {result.difference.toFixed(1)} {">"}{" "}
            {result.threshold.toFixed(1)}
          </span>
          <span
            className={`font-semibold ${
              result.wouldReceivePenalty ? "text-destructive" : "text-primary"
            }`}
          >
            {result.wouldReceivePenalty ? "TAK" : "NIE"}
          </span>
        </div>
      </div>
    </div>
  </div>
);

const singleForm = FormReact.make(singleFormBuilder, {
  fields: {
    attackerLevel: EffectNumberField,
    victimLevel: EffectNumberField,
  },
  mode: { validation: "onChange" },
  onSubmit: (_, { decoded }) =>
    Effect.sync(() => ({
      actualDifference: decoded.attackerLevel - decoded.victimLevel,
      attackerLevel: decoded.attackerLevel,
      maxAttackerWithoutPenalty: calculateMaxAttackerLevelWithoutPenalty(
        decoded.victimLevel
      ),
      minLevelDifference: calculateMinLevelDifference(decoded.attackerLevel),
      minVictimLevelForPenalty: calculateMinVictimLevelForPenalty(
        decoded.attackerLevel
      ),
      victimLevel: decoded.victimLevel,
      wouldReceivePenalty: wouldReceivePenalty(
        decoded.attackerLevel,
        decoded.victimLevel
      ),
    })),
});

const groupForm = FormReact.make(groupFormBuilder, {
  fields: {
    attackerLevels: EffectTextField,
    defenderLevels: EffectTextField,
  },
  mode: { validation: "onChange" },
  onSubmit: (_, { decoded }) =>
    Effect.sync(() => {
      const attackerLevels = parseLevels(decoded.attackerLevels);
      const defenderLevels = parseLevels(decoded.defenderLevels);
      const groupCalculation = calculateGroupAttackPenalty(
        attackerLevels,
        defenderLevels
      );

      return {
        attackerLevels,
        defenderLevels,
        ...groupCalculation,
      };
    }),
});

interface CalculatorListPageProps {
  session: AuthSession;
}

export default function CalculatorListPage(_props: CalculatorListPageProps) {
  const [mode, setMode] = useState<"single" | "group">("single");
  const singleSubmit = useAtomSet(singleForm.submit);
  const singleSubmitResult = useAtomValue(singleForm.submit);
  const groupSubmit = useAtomSet(groupForm.submit);
  const groupSubmitResult = useAtomValue(groupForm.submit);
  const result = AsyncResult.isSuccess(singleSubmitResult)
    ? singleSubmitResult.value
    : null;
  const groupResult = AsyncResult.isSuccess(groupSubmitResult)
    ? groupSubmitResult.value
    : null;

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
        {mode === "single" && (
          <singleForm.Initialize
            defaultValues={{ attackerLevel: 200, victimLevel: 150 }}
          >
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
                <form action={() => singleSubmit()} className="mt-2 grid gap-4">
                  <singleForm.attackerLevel label="Poziom atakującego" />
                  <singleForm.victimLevel label="Poziom ofiary" />
                  <Button
                    className="w-full"
                    disabled={singleSubmitResult.waiting}
                    type="submit"
                  >
                    {singleSubmitResult.waiting ? "Obliczanie..." : "Sprawdź"}
                  </Button>
                </form>
              </div>
            </div>

            {result && <SingleModeResult result={result} />}
          </singleForm.Initialize>
        )}

        {mode === "group" && (
          <groupForm.Initialize
            defaultValues={{
              attackerLevels: "200, 180, 160",
              defenderLevels: "150, 140",
            }}
          >
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
                <form action={() => groupSubmit()} className="mt-2 grid gap-4">
                  <groupForm.attackerLevels label="Poziomy atakujących" />
                  <groupForm.defenderLevels label="Poziomy obrońców" />
                  <Button
                    className="w-full"
                    disabled={groupSubmitResult.waiting}
                    type="submit"
                  >
                    {groupSubmitResult.waiting ? "Obliczanie..." : "Sprawdź"}
                  </Button>
                </form>
              </div>
            </div>

            {groupResult && <GroupModeResult result={groupResult} />}
          </groupForm.Initialize>
        )}
      </div>

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

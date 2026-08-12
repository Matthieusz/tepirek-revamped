import { useSelector } from "@tanstack/react-form";
import * as Schema from "effect/Schema";
import { AlertTriangle, Calculator, Shield, User, Users } from "lucide-react";
import { useState } from "react";

import { useAppForm } from "@/components/forms/app-form";
import { Form } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import {
  calculateGroupAttackPenalty,
  calculateMaxAttackerLevelWithoutPenalty,
  calculateMinLevelDifference,
  calculateMinVictimLevelForPenalty,
  parseLevels,
  wouldReceivePenalty,
} from "@/features/calculators/bounty";
import type {
  GroupPenaltyResult,
  SinglePenaltyResult,
} from "@/features/calculators/bounty";
import {
  CalculatorLevelSchema,
  CalculatorLevelsSchema,
} from "@/features/calculators/form-schemas";
import type { AuthSession } from "@/types/route";

const SingleFormSchema = Schema.Struct({
  attackerLevel: CalculatorLevelSchema,
  victimLevel: CalculatorLevelSchema,
});
const SingleFormValidator = Schema.toStandardSchemaV1(SingleFormSchema);

const GroupFormSchema = Schema.Struct({
  attackerLevels: CalculatorLevelsSchema,
  defenderLevels: CalculatorLevelsSchema,
});
const GroupFormValidator = Schema.toStandardSchemaV1(GroupFormSchema);

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

interface CalculatorListPageProps {
  session: AuthSession;
}

export default function CalculatorListPage(_props: CalculatorListPageProps) {
  const [mode, setMode] = useState<"single" | "group">("single");
  const [singleResult, setSingleResult] = useState<SinglePenaltyResult | null>(
    null
  );
  const [groupResult, setGroupResult] = useState<GroupPenaltyResult | null>(
    null
  );
  const singleForm = useAppForm({
    defaultValues: { attackerLevel: 200, victimLevel: 150 },
    onSubmit: async ({ value }) => {
      const decoded = await SingleFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      setSingleResult({
        actualDifference:
          decoded.value.attackerLevel - decoded.value.victimLevel,
        attackerLevel: decoded.value.attackerLevel,
        maxAttackerWithoutPenalty: calculateMaxAttackerLevelWithoutPenalty(
          decoded.value.victimLevel
        ),
        minLevelDifference: calculateMinLevelDifference(
          decoded.value.attackerLevel
        ),
        minVictimLevelForPenalty: calculateMinVictimLevelForPenalty(
          decoded.value.attackerLevel
        ),
        victimLevel: decoded.value.victimLevel,
        wouldReceivePenalty: wouldReceivePenalty(
          decoded.value.attackerLevel,
          decoded.value.victimLevel
        ),
      });
    },
    validators: { onChange: SingleFormValidator },
  });
  const groupForm = useAppForm({
    defaultValues: {
      attackerLevels: "200, 180, 160",
      defenderLevels: "150, 140",
    },
    onSubmit: async ({ value }) => {
      const decoded = await GroupFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const attackerLevels = parseLevels(decoded.value.attackerLevels);
      const defenderLevels = parseLevels(decoded.value.defenderLevels);
      setGroupResult({
        attackerLevels,
        defenderLevels,
        ...calculateGroupAttackPenalty(attackerLevels, defenderLevels),
      });
    },
    validators: { onChange: GroupFormValidator },
  });
  const singleIsSubmitting = useSelector(
    singleForm.store,
    (state) => state.isSubmitting
  );
  const groupIsSubmitting = useSelector(
    groupForm.store,
    (state) => state.isSubmitting
  );

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
              <singleForm.AppForm>
                <Form className="mt-2 grid gap-4" form={singleForm}>
                  <singleForm.AppField name="attackerLevel">
                    {(field) => (
                      <field.NumberField label="Poziom atakującego" />
                    )}
                  </singleForm.AppField>
                  <singleForm.AppField name="victimLevel">
                    {(field) => <field.NumberField label="Poziom ofiary" />}
                  </singleForm.AppField>
                  <Button
                    className="w-full"
                    disabled={singleIsSubmitting}
                    type="submit"
                  >
                    {singleIsSubmitting ? "Obliczanie..." : "Sprawdź"}
                  </Button>
                </Form>
              </singleForm.AppForm>
            </div>
          </div>
        )}

        {mode === "single" && singleResult && (
          <SingleModeResult result={singleResult} />
        )}

        {mode === "group" && (
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
              <groupForm.AppForm>
                <Form className="mt-2 grid gap-4" form={groupForm}>
                  <groupForm.AppField name="attackerLevels">
                    {(field) => <field.TextField label="Poziomy atakujących" />}
                  </groupForm.AppField>
                  <groupForm.AppField name="defenderLevels">
                    {(field) => <field.TextField label="Poziomy obrońców" />}
                  </groupForm.AppField>
                  <Button
                    className="w-full"
                    disabled={groupIsSubmitting}
                    type="submit"
                  >
                    {groupIsSubmitting ? "Obliczanie..." : "Sprawdź"}
                  </Button>
                </Form>
              </groupForm.AppForm>
            </div>
          </div>
        )}

        {mode === "group" && groupResult && (
          <GroupModeResult result={groupResult} />
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

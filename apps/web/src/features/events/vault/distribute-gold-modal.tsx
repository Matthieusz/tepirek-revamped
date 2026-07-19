/* oxlint-disable complexity, no-negated-condition */

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Coins } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import {
  EffectForm,
  EffectFormFeedback,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
import {
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/effect-form-field-helpers";
import { EffectFieldFrame } from "@/components/forms/effect-form-fields";
import { AsyncResultFailure } from "@/components/ui/async-result-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eventsAtom } from "@/features/events/core/event-atoms";
import { ALL_FILTER } from "@/features/events/core/event-hero-filter";
import {
  getEventSelectDisplay,
  getHeroSelectDisplay,
} from "@/features/events/core/select-display";
import {
  EventSelectItems,
  HeroSelectItems,
} from "@/features/events/core/select-utils";
import { heroesAtom } from "@/features/events/heroes/hero-atoms";
import { heroStatsAtom } from "@/features/events/ranking/ranking-atoms";
import { distributeGoldAtom } from "@/features/events/vault/vault-atoms";
import { GoldAmountSchema, RequiredSelectionSchema } from "@/lib/form-schemas";
import { formSubmission } from "@/lib/form-submission";
import { parseGoldAmount } from "@/lib/gold";

const distributeGoldFormBuilder = FormBuilder.empty
  .addField("eventId", RequiredSelectionSchema("Wybierz event"))
  .addField("goldAmount", GoldAmountSchema)
  .addField("heroId", RequiredSelectionSchema("Wybierz konkretnego herosa"));

interface GoldAmountFieldProps {
  readonly disabled: boolean;
}

const GoldAmountField: FormReact.FieldComponent<
  string,
  GoldAmountFieldProps
> = ({ field, props }) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const helperId = `${fieldId}-helper`;
  const hasError = Option.isSome(field.error);
  const describedBy = [helperId, hasError ? errorId : undefined]
    .filter((id): id is string => id !== undefined)
    .join(" ");

  return (
    <EffectFieldFrame
      error={field.error}
      fieldId={fieldId}
      helperText={
        <p className="text-muted-foreground text-xs" id={helperId}>
          Użyj &quot;g&quot; dla miliardów (np. 2g = 2 000 000 000)
        </p>
      }
      label="Kwota złota"
    >
      <Input
        aria-describedby={describedBy}
        aria-invalid={hasError}
        disabled={props.disabled}
        id={fieldId}
        name={field.path}
        onBlur={field.onBlur}
        onChange={(event) => field.onChange(event.target.value)}
        placeholder="np. 2g lub 50000000"
        type="text"
        value={field.value}
      />
    </EffectFieldFrame>
  );
};

interface HeroStats {
  heroId: number;
  heroName: string;
  currentPointWorth: number;
  totalBets: number;
  totalPoints: number;
}

const getModalEventSelectDisplay = (params: {
  selectedEventId: string;
  events:
    | {
        color: string | null;
        endTime: Date;
        icon: string;
        id: number;
        name: string;
      }[]
    | undefined;
}): ReactNode =>
  getEventSelectDisplay({
    events: params.events,
    selectedEventId: params.selectedEventId,
  });

const getModalHeroSelectDisplay = (params: {
  selectedEventId: string;
  selectedHeroId: string;
  heroes: { id: number; name: string }[] | undefined;
}): string =>
  getHeroSelectDisplay({
    allLabel: "Wybierz herosa...",
    placeholder: "Wybierz herosa...",
    selectedEventId: params.selectedEventId,
    selectedHeroId: params.selectedHeroId,
    sortedHeroes: params.heroes,
  });

interface EventFieldProps {
  readonly events: readonly {
    color: string | null;
    endTime: Date;
    icon: string;
    id: number;
    name: string;
  }[];
  readonly loading: boolean;
  readonly onEventChange: () => void;
}

const EventField: FormReact.FieldComponent<string, EventFieldProps> = ({
  field,
  props,
}) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const hasError = Option.isSome(field.error);
  return (
    <EffectFieldFrame error={field.error} fieldId={fieldId} label="Event">
      <Select
        disabled={props.loading}
        name={field.path}
        onValueChange={(value) => {
          field.onChange(value ?? ALL_FILTER);
          props.onEventChange();
        }}
        value={field.value}
      >
        <SelectTrigger
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError}
          className="w-full"
          id={fieldId}
          onBlur={field.onBlur}
        >
          <SelectValue>
            {getModalEventSelectDisplay({
              events: [...props.events],
              selectedEventId: field.value,
            })}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {props.loading ? (
            <SelectItem disabled value="loading">
              Ładowanie...
            </SelectItem>
          ) : (
            <EventSelectItems events={[...props.events]} />
          )}
        </SelectContent>
      </Select>
    </EffectFieldFrame>
  );
};

interface HeroFieldProps {
  readonly disabled: boolean;
  readonly heroes: readonly { id: number; name: string }[];
  readonly heroesLoading: boolean;
  readonly selectedEventId: string;
}

const HeroField: FormReact.FieldComponent<string, HeroFieldProps> = ({
  field,
  props,
}) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const hasError = Option.isSome(field.error);
  return (
    <EffectFieldFrame error={field.error} fieldId={fieldId} label="Heros">
      <Select
        disabled={props.disabled}
        name={field.path}
        onValueChange={(value) => field.onChange(value ?? ALL_FILTER)}
        value={props.disabled ? "" : field.value}
      >
        <SelectTrigger
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError}
          className="w-full"
          id={fieldId}
          onBlur={field.onBlur}
        >
          <SelectValue>
            {getModalHeroSelectDisplay({
              heroes: [...props.heroes],
              selectedEventId: props.selectedEventId,
              selectedHeroId: field.value,
            })}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <HeroSelectItems
            allLabel="Wybierz herosa..."
            heroesLoading={props.heroesLoading}
            sortedHeroes={[...props.heroes]}
          />
        </SelectContent>
      </Select>
    </EffectFieldFrame>
  );
};

const HeroStatsPreview = ({
  heroStats,
  isFailure,
  isPending,
  onRetry,
}: {
  heroStats: HeroStats | undefined;
  isFailure: boolean;
  isPending: boolean;
  onRetry: () => void;
}) => {
  if (isFailure) {
    return (
      <AsyncResultFailure
        message="Nie udało się wczytać statystyk herosa."
        onRetry={onRetry}
      />
    );
  }

  if (isPending) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-muted-foreground text-sm">Ładowanie statystyk...</p>
      </div>
    );
  }

  if (!heroStats) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-muted-foreground text-sm">
          Brak danych dla tego herosa
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="space-y-2">
        <h4 className="font-semibold">{heroStats.heroName}</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Suma punktów</p>
            <p className="font-mono font-semibold">
              {heroStats.totalPoints.toFixed(2)}
            </p>
          </div>
          {heroStats.currentPointWorth > 0 && (
            <div>
              <p className="text-muted-foreground">Aktualna wartość punktu</p>
              <p className="font-mono font-semibold">
                {heroStats.currentPointWorth.toLocaleString("pl-PL")} złota
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface GoldDistribution {
  readonly eventId: number;
  readonly goldAmount: number;
  readonly heroId: number;
}

interface GoldDistributionResult {
  readonly usersUpdated: number;
}

type DistributeGold = (
  distribution: GoldDistribution
) => Promise<GoldDistributionResult>;

const distributeGoldForm = FormReact.make(distributeGoldFormBuilder, {
  fields: {
    eventId: EventField,
    goldAmount: GoldAmountField,
    heroId: HeroField,
  },
  mode: { validation: "onSubmit" },
  onSubmit: (distributeGold: DistributeGold, { decoded }) => {
    const goldAmount = parseGoldAmount(decoded.goldAmount);
    return formSubmission(() =>
      distributeGold({
        eventId: Number.parseInt(decoded.eventId, 10),
        goldAmount,
        heroId: Number.parseInt(decoded.heroId, 10),
      })
    ).pipe(Effect.map((result) => ({ goldAmount, result })));
  },
});

interface DistributeGoldModalProps {
  trigger: React.ReactNode;
  selectedEventId?: string;
  selectedHeroId?: string;
}

export const DistributeGoldModal = ({
  trigger,
  selectedEventId = "all",
  selectedHeroId = "all",
}: DistributeGoldModalProps) => {
  const [open, setOpen] = useState(false);
  const distributeGold = useAtomSet(distributeGoldAtom, { mode: "promise" });

  const eventsResult = useAtomValue(eventsAtom);
  const events = AsyncResult.isSuccess(eventsResult)
    ? [...eventsResult.value]
    : [];
  const eventsLoading = !AsyncResult.isSuccess(eventsResult);

  const heroesResult = useAtomValue(heroesAtom);
  const heroes = AsyncResult.isSuccess(heroesResult) ? heroesResult.value : [];
  const heroesLoading = !AsyncResult.isSuccess(heroesResult);

  const submit = useAtomSet(distributeGoldForm.submit, { mode: "promise" });
  const reset = useAtomSet(distributeGoldForm.reset);
  const submitResult = useAtomValue(distributeGoldForm.submit);
  const isDirty = useAtomValue(distributeGoldForm.isDirty);
  const canDiscard = useEffectFormProtection(isDirty, submitResult.waiting);

  const handleSubmit = async (): Promise<void> => {
    try {
      await submit(async (distribution: GoldDistribution) => {
        const result = await distributeGold(distribution);
        toast.success(
          `Rozdzielono ${distribution.goldAmount.toLocaleString("pl-PL")} złota dla ${result.usersUpdated} graczy`
        );
        reset();
        setOpen(false);
        return result;
      });
    } catch {
      // Effect Form owns the persistent failure message and keeps the draft.
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (!canDiscard()) {
        return;
      }
      reset();
    }
    setOpen(nextOpen);
  };

  const clearHero = useAtomSet(
    distributeGoldForm.getFieldAtoms(distributeGoldForm.fields.heroId).setValue
  );
  const formValues = useAtomValue(distributeGoldForm.values);
  const eventId = Option.match(formValues, {
    onNone: () => selectedEventId,
    onSome: (values) => values.eventId,
  });
  const heroId = Option.match(formValues, {
    onNone: () => selectedHeroId,
    onSome: (values) => values.heroId,
  });
  const goldAmountValue = Option.match(formValues, {
    onNone: () => "0",
    onSome: (values) => values.goldAmount || "0",
  });
  const goldAmount = parseGoldAmount(goldAmountValue);
  const filteredHeroes = (
    eventId === ALL_FILTER
      ? []
      : heroes?.filter((hero) => hero.eventId?.toString() === eventId)
  )?.toSorted((firstHero, secondHero) => firstHero.level - secondHero.level);
  const parsedHeroId =
    heroId === ALL_FILTER ? null : Number.parseInt(heroId, 10);
  const heroStatsAtomValue = heroStatsAtom({ heroId: parsedHeroId });
  const heroStatsResult = useAtomValue(heroStatsAtomValue);
  const refreshHeroStats = useAtomRefresh(heroStatsAtomValue);
  const heroStats =
    heroId !== ALL_FILTER && open && AsyncResult.isSuccess(heroStatsResult)
      ? heroStatsResult.value
      : undefined;
  const heroStatsPending =
    heroId !== ALL_FILTER && open && !AsyncResult.isSuccess(heroStatsResult);
  const heroStatsFailure =
    heroId !== ALL_FILTER && open && AsyncResult.isFailure(heroStatsResult);
  const dependentDataLoading =
    eventsLoading || heroesLoading || heroStatsPending;
  let submitLabel = "Rozdziel złoto";
  if (dependentDataLoading) {
    submitLabel = "Ładowanie...";
  }
  if (submitResult.waiting) {
    submitLabel = "Rozdzielanie...";
  }
  const pointWorth =
    heroStats && heroStats.totalPoints > 0
      ? goldAmount / heroStats.totalPoints
      : 0;

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-125">
        <distributeGoldForm.Initialize
          defaultValues={{
            eventId: selectedEventId,
            goldAmount: "",
            heroId: selectedHeroId,
          }}
          key={`${selectedEventId}-${selectedHeroId}`}
        >
          <EffectForm action={handleSubmit} submitResult={submitResult}>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle className="flex items-center gap-2">
                <Coins className="size-5 text-yellow-500" />
                Rozdziel złoto
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Ustaw kwotę złota do rozdzielenia dla herosa. Złoto zostanie
                podzielone proporcjonalnie do punktów każdego gracza.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="grid gap-4 py-4">
              <distributeGoldForm.eventId
                events={events}
                loading={eventsLoading}
                onEventChange={() => clearHero(ALL_FILTER)}
              />
              <distributeGoldForm.heroId
                disabled={eventId === ALL_FILTER || heroesLoading}
                heroes={filteredHeroes}
                heroesLoading={heroesLoading}
                selectedEventId={eventId}
              />

              {/* Hero Stats Preview */}
              {heroId !== ALL_FILTER && (
                <HeroStatsPreview
                  heroStats={heroStats}
                  isFailure={heroStatsFailure}
                  isPending={heroStatsPending}
                  onRetry={refreshHeroStats}
                />
              )}

              {/* Gold Amount Input */}
              <distributeGoldForm.goldAmount
                disabled={heroId === ALL_FILTER || heroStatsPending}
              />
              {goldAmount > 0 && (
                <p className="font-mono text-muted-foreground text-xs">
                  = {goldAmount.toLocaleString("pl-PL")} złota
                </p>
              )}

              {/* Point Worth Preview */}
              {heroId !== ALL_FILTER &&
                goldAmount > 0 &&
                heroStats &&
                heroStats.totalPoints > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h4 className="mb-2 font-semibold text-primary text-sm">
                      Podgląd rozdziału
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">
                          Wartość jednego punktu
                        </p>
                        <p className="font-mono font-semibold">
                          {pointWorth.toLocaleString("pl-PL", {
                            maximumFractionDigits: 2,
                          })}{" "}
                          złota
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Złoto do rozdzielenia
                        </p>
                        <p className="font-mono font-semibold">
                          {goldAmount.toLocaleString("pl-PL")}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-muted-foreground text-xs">
                      Formuła: złoto gracza = punkty gracza ×{" "}
                      {pointWorth.toFixed(2)}
                    </p>
                  </div>
                )}
            </div>
            <EffectFormFeedback result={submitResult} />
            <ResponsiveDialogFooter>
              <Button
                disabled={submitResult.waiting}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Anuluj
              </Button>
              <Button
                disabled={
                  submitResult.waiting ||
                  dependentDataLoading ||
                  heroId === ALL_FILTER ||
                  !heroStats ||
                  heroStats.totalPoints <= 0
                }
                type="submit"
              >
                {submitLabel}
              </Button>
            </ResponsiveDialogFooter>
          </EffectForm>
        </distributeGoldForm.Initialize>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Coins } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback, useCanCloseForm } from "@/components/forms/form";
import { AsyncResultFailure } from "@/components/ui/async-result-boundary";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { eventsAtom } from "@/features/events/core/event-atoms";
import {
  ALL_FILTER,
  toQueryInput,
} from "@/features/events/core/event-hero-filter";
import {
  EventFormField,
  HeroFormField,
} from "@/features/events/core/event-hero-form-fields";
import { heroesAtom } from "@/features/events/heroes/hero-atoms";
import {
  GoldAmountSchema,
  RequiredSelectionSchema,
} from "@/features/events/ranking/form-schemas";
import { heroStatsAtom } from "@/features/events/ranking/ranking-atoms";
import { distributeGoldAtom } from "@/features/events/vault/vault-atoms";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";
import { parseGoldAmount } from "@/lib/gold";

const GoldFormSchema = Schema.Struct({
  eventId: RequiredSelectionSchema("Wybierz event"),
  goldAmount: GoldAmountSchema,
  heroId: RequiredSelectionSchema("Wybierz konkretnego herosa"),
});
const GoldFormValidator = Schema.toStandardSchemaV1(GoldFormSchema);

interface HeroStats {
  heroId: number;
  heroName: string;
  currentPointWorth: number;
  totalBets: number;
  totalPoints: number;
}

type HeroStatsPreviewState =
  | { readonly _tag: "hidden" }
  | { readonly _tag: "loading" }
  | { readonly _tag: "failure"; readonly onRetry: () => void }
  | { readonly _tag: "empty" }
  | { readonly _tag: "success"; readonly heroStats: HeroStats };

const getHeroStatsPreviewState = (params: {
  readonly enabled: boolean;
  readonly onRetry: () => void;
  readonly result: AsyncResult.AsyncResult<HeroStats | undefined, unknown>;
}): HeroStatsPreviewState => {
  if (!params.enabled) {
    return { _tag: "hidden" };
  }
  if (AsyncResult.isFailure(params.result)) {
    return { _tag: "failure", onRetry: params.onRetry };
  }
  if (!AsyncResult.isSuccess(params.result)) {
    return { _tag: "loading" };
  }
  if (params.result.value === undefined) {
    return { _tag: "empty" };
  }
  return { _tag: "success", heroStats: params.result.value };
};

const HeroStatsPreview = ({
  state,
}: {
  readonly state: Exclude<HeroStatsPreviewState, { readonly _tag: "hidden" }>;
}) => {
  if (state._tag === "failure") {
    return (
      <AsyncResultFailure
        message="Nie udało się wczytać statystyk herosa."
        onRetry={state.onRetry}
      />
    );
  }

  if (state._tag === "loading") {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-muted-foreground text-sm">Ładowanie statystyk...</p>
      </div>
    );
  }

  if (state._tag === "empty") {
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
        <h4 className="font-semibold">{state.heroStats.heroName}</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Suma punktów</p>
            <p className="font-mono font-semibold">
              {state.heroStats.totalPoints.toFixed(2)}
            </p>
          </div>
          {state.heroStats.currentPointWorth > 0 && (
            <div>
              <p className="text-muted-foreground">Aktualna wartość punktu</p>
              <p className="font-mono font-semibold">
                {state.heroStats.currentPointWorth.toLocaleString("pl-PL")}{" "}
                złota
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getEventsState = (
  result: AsyncResult.AsyncResult<
    readonly {
      color: string | null;
      endTime: Date;
      icon: string;
      id: number;
      name: string;
    }[],
    unknown
  >
) => {
  if (AsyncResult.isSuccess(result)) {
    return { events: [...result.value], loading: false };
  }
  return { events: [], loading: true };
};

const getHeroesState = (
  result: AsyncResult.AsyncResult<
    readonly {
      eventId: number | null;
      id: number;
      level: number;
      name: string;
    }[],
    unknown
  >
) => {
  if (AsyncResult.isSuccess(result)) {
    return { heroes: result.value, loading: false };
  }
  return { heroes: [], loading: true };
};

const filterHeroesForEvent = (
  eventId: string,
  heroes: readonly {
    eventId: number | null;
    id: number;
    level: number;
    name: string;
  }[]
) =>
  Arr.sortWith(
    Arr.filter<(typeof heroes)[number]>(
      (hero) => hero.eventId?.toString() === eventId
    )(eventId === ALL_FILTER ? [] : heroes),
    (hero) => hero.level,
    Order.Number
  );

const getHeroStats = (state: HeroStatsPreviewState): HeroStats | undefined =>
  state._tag === "success" ? state.heroStats : undefined;

const getSubmitLabel = (params: {
  readonly dependentDataLoading: boolean;
  readonly isSubmitting: boolean;
}): string => {
  if (params.isSubmitting) {
    return "Rozdzielanie...";
  }
  if (params.dependentDataLoading) {
    return "Ładowanie...";
  }
  return "Rozdziel złoto";
};

const HeroStatsPreviewSlot = ({
  state,
}: {
  readonly state: HeroStatsPreviewState;
}) => {
  if (state._tag === "hidden") {
    return null;
  }
  return <HeroStatsPreview state={state} />;
};

const GoldAmountPreview = ({ goldAmount }: { readonly goldAmount: number }) => {
  if (goldAmount <= 0) {
    return null;
  }
  return (
    <p className="font-mono text-muted-foreground text-xs">
      = {goldAmount.toLocaleString("pl-PL")} złota
    </p>
  );
};

const DistributionPreview = ({
  goldAmount,
  heroId,
  heroStats,
  pointWorth,
}: {
  readonly goldAmount: number;
  readonly heroId: string;
  readonly heroStats: HeroStats | undefined;
  readonly pointWorth: number;
}) => {
  if (
    heroId === ALL_FILTER ||
    goldAmount <= 0 ||
    heroStats === undefined ||
    heroStats.totalPoints <= 0
  ) {
    return null;
  }
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <h4 className="mb-2 font-semibold text-primary text-sm">
        Podgląd rozdziału
      </h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Wartość jednego punktu</p>
          <p className="font-mono font-semibold">
            {pointWorth.toLocaleString("pl-PL", {
              maximumFractionDigits: 2,
            })}{" "}
            złota
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Złoto do rozdzielenia</p>
          <p className="font-mono font-semibold">
            {goldAmount.toLocaleString("pl-PL")}
          </p>
        </div>
      </div>
      <p className="mt-2 text-muted-foreground text-xs">
        Formuła: złoto gracza = punkty gracza × {pointWorth.toFixed(2)}
      </p>
    </div>
  );
};

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
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const distributeGold = useAtomSet(distributeGoldAtom, { mode: "promise" });

  const eventsResult = useAtomValue(eventsAtom);
  const eventsState = getEventsState(eventsResult);
  const { events, loading: eventsLoading } = eventsState;

  const heroesResult = useAtomValue(heroesAtom);
  const heroesState = getHeroesState(heroesResult);
  const { heroes, loading: heroesLoading } = heroesState;

  const form = useAppForm({
    defaultValues: {
      eventId: selectedEventId,
      goldAmount: "",
      heroId: selectedHeroId,
    },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded = await GoldFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const goldAmount = parseGoldAmount(decoded.value.goldAmount);
      const result = await runFormSubmission(() =>
        distributeGold({
          eventId: decoded.value.eventId,
          goldAmount,
          heroId: decoded.value.heroId,
        })
      );
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }

      toast.success(
        `Rozdzielono ${goldAmount.toLocaleString("pl-PL")} złota dla ${result.value.usersUpdated} graczy`
      );
      form.reset();
      setOpen(false);
    },
    validators: { onSubmit: GoldFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const eventId = useSelector(form.store, (state) => state.values.eventId);
  const heroId = useSelector(form.store, (state) => state.values.heroId);
  const goldAmountValue = useSelector(
    form.store,
    (state) => state.values.goldAmount
  );
  const canDiscard = useCanCloseForm(isSubmitting);

  useEffect(() => {
    form.reset({
      eventId: selectedEventId,
      goldAmount: "",
      heroId: selectedHeroId,
    });
    setSubmissionFailure(undefined);
  }, [form, selectedEventId, selectedHeroId]);

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      if (!canDiscard()) {
        return;
      }
      form.reset();
      setSubmissionFailure(undefined);
    }
    setOpen(nextOpen);
  };

  const filteredHeroes = filterHeroesForEvent(eventId, heroes);
  const parsedHeroId = toQueryInput(heroId) ?? null;
  const heroStatsAtomValue = heroStatsAtom({ heroId: parsedHeroId });
  const heroStatsResult = useAtomValue(heroStatsAtomValue);
  const refreshHeroStats = useAtomRefresh(heroStatsAtomValue);
  const heroStatsPreviewState = getHeroStatsPreviewState({
    enabled: heroId !== ALL_FILTER && open,
    onRetry: refreshHeroStats,
    result: heroStatsResult,
  });
  const heroStats = getHeroStats(heroStatsPreviewState);
  const dependentDataLoading =
    eventsLoading || heroesLoading || heroStatsPreviewState._tag === "loading";
  const goldAmount = parseGoldAmount(goldAmountValue || "0");
  const pointWorth =
    heroStats && heroStats.totalPoints > 0
      ? goldAmount / heroStats.totalPoints
      : 0;
  const submitLabel = getSubmitLabel({
    dependentDataLoading,
    isSubmitting,
  });

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-125">
        <form.AppForm>
          <Form form={form}>
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
              <form.Field name="eventId">
                {(field) => (
                  <EventFormField
                    events={events}
                    eventsLoading={eventsLoading}
                    field={field}
                    onChange={(nextEventId) => {
                      field.handleChange(nextEventId);
                      form.setFieldValue("heroId", ALL_FILTER);
                    }}
                  />
                )}
              </form.Field>

              <form.Field name="heroId">
                {(field) => (
                  <HeroFormField
                    eventId={eventId}
                    field={field}
                    heroes={[...filteredHeroes]}
                    heroesLoading={heroesLoading}
                  />
                )}
              </form.Field>

              <HeroStatsPreviewSlot state={heroStatsPreviewState} />

              <form.AppField name="goldAmount">
                {(field) => (
                  <field.TextField
                    disabled={
                      heroId === ALL_FILTER ||
                      heroStatsPreviewState._tag === "loading"
                    }
                    helperText={
                      <p className="text-muted-foreground text-xs">
                        Użyj &quot;g&quot; dla miliardów (np. 2g = 2 000 000
                        000)
                      </p>
                    }
                    label="Kwota złota"
                    placeholder="np. 2g lub 50000000"
                  />
                )}
              </form.AppField>
              <GoldAmountPreview goldAmount={goldAmount} />

              <DistributionPreview
                goldAmount={goldAmount}
                heroId={heroId}
                heroStats={heroStats}
                pointWorth={pointWorth}
              />
            </div>
            <FormFeedback failure={submissionFailure} />
            <ResponsiveDialogFooter>
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  handleOpenChange(false);
                }}
                type="button"
                variant="outline"
              >
                Anuluj
              </Button>
              <Button
                disabled={
                  isSubmitting ||
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
          </Form>
        </form.AppForm>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

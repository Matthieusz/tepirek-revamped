/* oxlint-disable complexity, no-negated-condition */

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Coins } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback, useCanCloseForm } from "@/components/forms/form";
import {
  FormFieldFrame,
  getFieldErrorMessage,
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/form-field-helpers";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { eventsAtom } from "@/features/events/core/event-atoms";
import {
  ALL_FILTER,
  toQueryInput,
} from "@/features/events/core/event-hero-filter";
import {
  getEventSelectDisplay,
  getHeroSelectDisplay,
} from "@/features/events/core/select-display";
import {
  EventSelectItems,
  HeroSelectItems,
} from "@/features/events/core/select-utils";
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

const getModalEventSelectDisplay = (params: {
  readonly selectedEventId: string;
  readonly events:
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
  readonly selectedEventId: string;
  readonly selectedHeroId: string;
  readonly heroes: { id: number; name: string }[] | undefined;
}): string =>
  getHeroSelectDisplay({
    allLabel: "Wybierz herosa...",
    placeholder: "Wybierz herosa...",
    selectedEventId: params.selectedEventId,
    selectedHeroId: params.selectedHeroId,
    sortedHeroes: params.heroes,
  });

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
  const events = AsyncResult.isSuccess(eventsResult)
    ? [...eventsResult.value]
    : [];
  const eventsLoading = !AsyncResult.isSuccess(eventsResult);

  const heroesResult = useAtomValue(heroesAtom);
  const heroes = AsyncResult.isSuccess(heroesResult) ? heroesResult.value : [];
  const heroesLoading = !AsyncResult.isSuccess(heroesResult);

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

  const filteredHeroes = Arr.sortWith(
    eventId === ALL_FILTER
      ? []
      : Arr.filter<(typeof heroes)[number]>(
          (hero) => hero.eventId?.toString() === eventId
        )(heroes ?? []),
    (hero) => hero.level,
    Order.Number
  );
  const parsedHeroId = toQueryInput(heroId) ?? null;
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
  const goldAmount = parseGoldAmount(goldAmountValue || "0");
  const pointWorth =
    heroStats && heroStats.totalPoints > 0
      ? goldAmount / heroStats.totalPoints
      : 0;
  let submitLabel = "Rozdziel złoto";
  if (dependentDataLoading) {
    submitLabel = "Ładowanie...";
  }
  if (isSubmitting) {
    submitLabel = "Rozdzielanie...";
  }

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
                {(field) => {
                  const fieldId = getFieldId(field.name);
                  const errorId = getFieldErrorId(fieldId);
                  const error = getFieldErrorMessage(field.state.meta.errors);
                  const showError =
                    error !== undefined &&
                    (field.state.meta.isTouched ||
                      field.form.state.submissionAttempts > 0);
                  return (
                    <FormFieldFrame
                      error={showError ? error : undefined}
                      fieldId={fieldId}
                      label="Event"
                    >
                      <Select
                        disabled={eventsLoading}
                        name={field.name}
                        onValueChange={(value) => {
                          field.handleChange(value ?? ALL_FILTER);
                          form.setFieldValue("heroId", ALL_FILTER);
                        }}
                        value={field.state.value}
                      >
                        <SelectTrigger
                          aria-describedby={showError ? errorId : undefined}
                          aria-invalid={showError || undefined}
                          className="w-full"
                          id={fieldId}
                          onBlur={field.handleBlur}
                        >
                          <SelectValue>
                            {getModalEventSelectDisplay({
                              events,
                              selectedEventId: field.state.value,
                            })}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {eventsLoading ? (
                            <SelectItem disabled value="loading">
                              Ładowanie...
                            </SelectItem>
                          ) : (
                            <EventSelectItems events={events} />
                          )}
                        </SelectContent>
                      </Select>
                    </FormFieldFrame>
                  );
                }}
              </form.Field>

              <form.Field name="heroId">
                {(field) => {
                  const fieldId = getFieldId(field.name);
                  const errorId = getFieldErrorId(fieldId);
                  const error = getFieldErrorMessage(field.state.meta.errors);
                  const showError =
                    error !== undefined &&
                    (field.state.meta.isTouched ||
                      field.form.state.submissionAttempts > 0);
                  return (
                    <FormFieldFrame
                      error={showError ? error : undefined}
                      fieldId={fieldId}
                      label="Heros"
                    >
                      <Select
                        disabled={eventId === ALL_FILTER || heroesLoading}
                        name={field.name}
                        onValueChange={(value) => {
                          field.handleChange(value ?? ALL_FILTER);
                        }}
                        value={
                          eventId === ALL_FILTER
                            ? ALL_FILTER
                            : field.state.value
                        }
                      >
                        <SelectTrigger
                          aria-describedby={showError ? errorId : undefined}
                          aria-invalid={showError || undefined}
                          className="w-full"
                          id={fieldId}
                          onBlur={field.handleBlur}
                        >
                          <SelectValue>
                            {getModalHeroSelectDisplay({
                              heroes: [...filteredHeroes],
                              selectedEventId: eventId,
                              selectedHeroId: field.state.value,
                            })}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <HeroSelectItems
                            allLabel="Wybierz herosa..."
                            heroesLoading={heroesLoading}
                            sortedHeroes={[...filteredHeroes]}
                          />
                        </SelectContent>
                      </Select>
                    </FormFieldFrame>
                  );
                }}
              </form.Field>

              {heroId !== ALL_FILTER && (
                <HeroStatsPreview
                  heroStats={heroStats}
                  isFailure={heroStatsFailure}
                  isPending={heroStatsPending}
                  onRetry={refreshHeroStats}
                />
              )}

              <form.AppField name="goldAmount">
                {(field) => (
                  <field.TextField
                    disabled={heroId === ALL_FILTER || heroStatsPending}
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
              {goldAmount > 0 && (
                <p className="font-mono text-muted-foreground text-xs">
                  = {goldAmount.toLocaleString("pl-PL")} złota
                </p>
              )}

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

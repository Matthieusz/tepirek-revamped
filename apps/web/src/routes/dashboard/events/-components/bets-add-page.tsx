import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback } from "@/components/forms/form";
import {
  FormFieldError,
  FormFieldFrame,
  getFieldErrorMessage,
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/form-field-helpers";
import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createBetAtom,
  latestBetForCopyAtom,
} from "@/features/events/bets/bet-atoms";
import { NonEmptyUserIdsSchema } from "@/features/events/bets/form-schemas";
import { HeroBetMemberPicker } from "@/features/events/bets/hero-bet-member-picker";
import { HeroCardsGrid } from "@/features/events/bets/hero-cards-grid";
import { eventsAtom } from "@/features/events/core/event-atoms";
import { heroesAtom } from "@/features/events/heroes/hero-atoms";
import { verifiedUsersAtom } from "@/features/users/user-atoms";
import { getEventIcon } from "@/lib/constants";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";
import { isAdmin } from "@/lib/route-helpers";
import type { AuthSession } from "@/types/route";

interface EventOption {
  readonly color: string;
  readonly endTime: Date;
  readonly icon: string;
  readonly id: number;
  readonly name: string;
}

const PositiveIntegerIdFromString = Schema.FiniteFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0))
);

const AddBetFormSchema = Schema.Struct({
  eventId: PositiveIntegerIdFromString.annotate({ message: "Wybierz event" }),
  heroId: PositiveIntegerIdFromString.annotate({ message: "Wybierz herosa" }),
  userIds: NonEmptyUserIdsSchema,
});
const AddBetFormValidator = Schema.toStandardSchemaV1(AddBetFormSchema);

interface BetsAddPageProps {
  session: AuthSession;
}

export const BetsAddPage = ({ session }: BetsAddPageProps) => {
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const createBet = useAtomSet(createBetAtom, { mode: "promise" });
  const isAdminUser = isAdmin(session);

  const eventsResult = useAtomValue(eventsAtom);
  const events =
    isAdminUser && AsyncResult.isSuccess(eventsResult)
      ? [...eventsResult.value]
      : undefined;
  const eventsLoading = isAdminUser && !AsyncResult.isSuccess(eventsResult);

  const heroesResult = useAtomValue(heroesAtom);
  const heroes =
    isAdminUser && AsyncResult.isSuccess(heroesResult)
      ? heroesResult.value
      : undefined;
  const heroesLoading = isAdminUser && !AsyncResult.isSuccess(heroesResult);

  const verifiedUsersResult = useAtomValue(verifiedUsersAtom);
  const verifiedUsers =
    isAdminUser && AsyncResult.isSuccess(verifiedUsersResult)
      ? [...verifiedUsersResult.value]
      : undefined;
  const usersLoading =
    isAdminUser && !AsyncResult.isSuccess(verifiedUsersResult);

  const latestBetResult = useAtomValue(latestBetForCopyAtom);
  const latestBetRaw = isAdminUser
    ? Option.getOrNull(AsyncResult.value(latestBetResult))
    : null;
  const latestBet =
    latestBetRaw === null
      ? null
      : { ...latestBetRaw, members: [...latestBetRaw.members] };
  const refreshEvents = useAtomRefresh(eventsAtom);
  const refreshHeroes = useAtomRefresh(heroesAtom);
  const refreshUsers = useAtomRefresh(verifiedUsersAtom);

  const form = useAppForm({
    defaultValues: {
      eventId: "",
      heroId: "",
      userIds: [] as readonly string[],
    },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded = await AddBetFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const result = await runFormSubmission(() =>
        createBet({
          heroId: decoded.value.heroId,
          userIds: decoded.value.userIds,
        })
      );
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }

      toast.success("Obstawienie dodano pomyślnie");
      form.setFieldValue("userIds", []);
    },
    validators: { onSubmit: AddBetFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const selectedEventId = useSelector(
    form.store,
    (state) => state.values.eventId
  );

  useHotkey(
    "Enter",
    () => {
      if (!isSubmitting) {
        void form.handleSubmit();
      }
    },
    {
      meta: {
        description: "Submit the bet creation form",
        name: "Create Bet",
      },
    }
  );

  if (!isAdminUser) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
            Dodaj obstawienie
          </h1>
          <p className="text-muted-foreground text-sm">
            Tylko administratorzy mogą dodawać obstawienia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AsyncResultBoundary onRetry={refreshEvents} result={eventsResult}>
      {() => (
        <AsyncResultBoundary onRetry={refreshHeroes} result={heroesResult}>
          {() => (
            <AsyncResultBoundary
              onRetry={refreshUsers}
              result={verifiedUsersResult}
            >
              {() => (
                <div className="mx-auto w-full max-w-4xl space-y-6">
                  <div>
                    <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
                      Dodaj obstawienie
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      Wybierz event, herosa i graczy.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-6">
                    <form.AppForm>
                      <Form className="space-y-6" form={form}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                          <form.Field name="eventId">
                            {(field) => {
                              const fieldId = getFieldId(field.name);
                              const errorId = getFieldErrorId(fieldId);
                              const error = getFieldErrorMessage(
                                field.state.meta.errors
                              );
                              const showError =
                                error !== undefined &&
                                (field.state.meta.isTouched ||
                                  field.form.state.submissionAttempts > 0);
                              const selectedEvent = events?.find(
                                (event) =>
                                  event.id.toString() === field.state.value
                              );
                              const SelectedIcon = selectedEvent
                                ? getEventIcon(selectedEvent.icon)
                                : null;

                              return (
                                <FormFieldFrame
                                  error={showError ? error : undefined}
                                  fieldId={fieldId}
                                  label="Event"
                                >
                                  <Select
                                    name={field.name}
                                    onValueChange={(value) => {
                                      if (value !== null) {
                                        field.handleChange(value);
                                        form.setFieldValue("heroId", "");
                                      }
                                    }}
                                    value={field.state.value}
                                  >
                                    <SelectTrigger
                                      aria-describedby={
                                        showError ? errorId : undefined
                                      }
                                      aria-invalid={showError || undefined}
                                      id={fieldId}
                                      onBlur={field.handleBlur}
                                    >
                                      <SelectValue placeholder="Wybierz event">
                                        {selectedEvent && SelectedIcon && (
                                          <span className="flex items-center gap-2">
                                            <SelectedIcon
                                              className="size-4"
                                              style={{
                                                color: selectedEvent.color,
                                              }}
                                            />
                                            {selectedEvent.name}
                                          </span>
                                        )}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {eventsLoading ? (
                                        <SelectItem disabled value="loading">
                                          Ładowanie...
                                        </SelectItem>
                                      ) : (
                                        events?.map((event: EventOption) => {
                                          const IconComponent = getEventIcon(
                                            event.icon
                                          );
                                          return (
                                            <SelectItem
                                              key={event.id}
                                              value={event.id.toString()}
                                            >
                                              <span className="flex items-center gap-2">
                                                <IconComponent
                                                  className="size-4"
                                                  style={{ color: event.color }}
                                                />
                                                {event.name}
                                              </span>
                                            </SelectItem>
                                          );
                                        })
                                      )}
                                    </SelectContent>
                                  </Select>
                                </FormFieldFrame>
                              );
                            }}
                          </form.Field>
                          <Button
                            className="h-10"
                            disabled={
                              isSubmitting ||
                              eventsLoading ||
                              heroesLoading ||
                              usersLoading
                            }
                            type="submit"
                          >
                            {isSubmitting ? (
                              <p className="flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin" />
                                Tworzenie obstawienia
                              </p>
                            ) : (
                              <p className="flex items-center gap-2">
                                Utwórz obstawienie
                                <Kbd>Enter</Kbd>
                              </p>
                            )}
                          </Button>
                        </div>

                        <form.Field name="heroId">
                          {(field) => {
                            const fieldId = getFieldId(field.name);
                            const errorId = getFieldErrorId(fieldId);
                            const error = getFieldErrorMessage(
                              field.state.meta.errors
                            );
                            const showError =
                              error !== undefined &&
                              (field.state.meta.isTouched ||
                                field.form.state.submissionAttempts > 0);
                            const content = (() => {
                              if (heroesLoading) {
                                return (
                                  <p className="text-muted-foreground text-sm">
                                    Ładowanie...
                                  </p>
                                );
                              }
                              if (selectedEventId === "") {
                                return (
                                  <p className="text-muted-foreground text-sm">
                                    Najpierw wybierz event
                                  </p>
                                );
                              }
                              const selectedEvent = Number(selectedEventId);
                              const filteredHeroes = heroes?.filter(
                                (hero) => hero.eventId === selectedEvent
                              );
                              return filteredHeroes?.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                  Brak herosów w tym evencie
                                </p>
                              ) : (
                                <HeroCardsGrid
                                  fieldName={field.name}
                                  heroes={filteredHeroes ?? []}
                                  onBlur={field.handleBlur}
                                  onSelectHero={field.handleChange}
                                  selectedHeroId={field.state.value}
                                />
                              );
                            })();

                            return (
                              <fieldset
                                aria-describedby={
                                  showError ? errorId : undefined
                                }
                                aria-invalid={showError || undefined}
                                aria-labelledby={`${fieldId}-label`}
                                className="grid gap-2"
                                id={fieldId}
                              >
                                <legend
                                  className="text-sm font-medium"
                                  id={`${fieldId}-label`}
                                >
                                  Heros
                                </legend>
                                {content}
                                <FormFieldError
                                  error={showError ? error : undefined}
                                  id={errorId}
                                />
                              </fieldset>
                            );
                          }}
                        </form.Field>

                        <form.Field name="userIds">
                          {(field) => {
                            const fieldId = getFieldId(field.name);
                            const errorId = getFieldErrorId(fieldId);
                            const error = getFieldErrorMessage(
                              field.state.meta.errors
                            );
                            const showError =
                              error !== undefined &&
                              (field.state.meta.isTouched ||
                                field.form.state.submissionAttempts > 0);
                            return (
                              <fieldset
                                aria-describedby={
                                  showError ? errorId : undefined
                                }
                                aria-invalid={showError || undefined}
                                aria-labelledby={`${fieldId}-label`}
                                className="grid gap-2"
                                id={fieldId}
                              >
                                <legend
                                  className="sr-only"
                                  id={`${fieldId}-label`}
                                >
                                  Gracze
                                </legend>
                                <HeroBetMemberPicker
                                  clearEnabled
                                  copyLastBetEnabled
                                  fieldName={field.name}
                                  idPrefix={fieldId}
                                  lastBet={latestBet ?? undefined}
                                  lastBetAvailable={latestBet !== null}
                                  onBlur={field.handleBlur}
                                  onChange={(userIds) => {
                                    field.handleChange(userIds);
                                  }}
                                  selectedUserIds={[...field.state.value]}
                                  users={verifiedUsers}
                                  usersLoading={usersLoading}
                                  variant="add"
                                />
                                <FormFieldError
                                  error={showError ? error : undefined}
                                  id={errorId}
                                />
                              </fieldset>
                            );
                          }}
                        </form.Field>
                        <FormFeedback failure={submissionFailure} />
                      </Form>
                    </form.AppForm>
                  </div>
                </div>
              )}
            </AsyncResultBoundary>
          )}
        </AsyncResultBoundary>
      )}
    </AsyncResultBoundary>
  );
};

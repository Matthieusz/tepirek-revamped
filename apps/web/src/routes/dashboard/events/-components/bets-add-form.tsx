import { useAtomSet } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import type { VerifiedMember } from "@tepirek-revamped/api/protocol/user/http-api-contract";
import * as Schema from "effect/Schema";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback } from "@/components/forms/form";
import {
  FormFieldError,
  FormFieldFrame,
} from "@/components/forms/form-field-helpers";
import {
  getFieldErrorId,
  getFieldErrorMessage,
  getFieldId,
} from "@/components/forms/form-field-utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBetAtom } from "@/features/events/bets/bet-atoms";
import { NonEmptyUserIdsSchema } from "@/features/events/bets/form-schemas";
import { HeroBetMemberPicker } from "@/features/events/bets/hero-bet-member-picker";
import { HeroCardsGrid } from "@/features/events/bets/hero-cards-grid";
import type { LastBetState } from "@/features/events/bets/member-selection";
import { getEventIcon } from "@/lib/constants";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";

interface EventOption {
  readonly color: string;
  readonly endTime: Date;
  readonly icon: string;
  readonly id: number;
  readonly name: string;
}

interface HeroOption {
  readonly eventId: number | null;
  readonly id: number;
  readonly image: string | null;
  readonly level: number;
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

interface BetsAddFormValues {
  readonly eventId: string;
  readonly heroId: string;
  readonly userIds: readonly string[];
}

interface BetsAddFormProps {
  readonly events: readonly EventOption[];
  readonly eventsLoading: boolean;
  readonly heroes: readonly HeroOption[];
  readonly heroesLoading: boolean;
  readonly lastBet: LastBetState;
  readonly users: readonly VerifiedMember[];
  readonly usersLoading: boolean;
}

const BETS_ADD_DEFAULT_VALUES: BetsAddFormValues = {
  eventId: "",
  heroId: "",
  userIds: [],
};

export const BetsAddForm = ({
  events,
  eventsLoading,
  heroes,
  heroesLoading,
  lastBet,
  users,
  usersLoading,
}: BetsAddFormProps) => {
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const createBet = useAtomSet(createBetAtom, { mode: "promise" });
  const form = useAppForm({
    defaultValues: BETS_ADD_DEFAULT_VALUES,
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

  return (
    <div className="border-border bg-card rounded-xl border p-6">
      <form.AppForm>
        <Form className="space-y-6" form={form}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <form.Field name="eventId">
              {(field) => {
                const fieldId = getFieldId(field.name);
                const errorId = getFieldErrorId(fieldId);
                const error = getFieldErrorMessage(field.state.meta.errors);
                const showError =
                  error !== undefined &&
                  (field.state.meta.isTouched ||
                    field.form.state.submissionAttempts > 0);
                const selectedEvent = events.find(
                  (event) => event.id.toString() === field.state.value
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
                        aria-describedby={showError ? errorId : undefined}
                        aria-invalid={showError || undefined}
                        id={fieldId}
                        onBlur={field.handleBlur}
                      >
                        <SelectValue placeholder="Wybierz event">
                          {selectedEvent && SelectedIcon && (
                            <span className="flex items-center gap-2">
                              <SelectedIcon
                                className="size-4"
                                style={{ color: selectedEvent.color }}
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
                          events.map((event) => {
                            const IconComponent = getEventIcon(event.icon);
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
                isSubmitting || eventsLoading || heroesLoading || usersLoading
              }
              type="submit"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Tworzenie obstawienia
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Utwórz obstawienie
                  <Kbd>Enter</Kbd>
                </span>
              )}
            </Button>
          </div>

          <form.Field name="heroId">
            {(field) => {
              const fieldId = getFieldId(field.name);
              const errorId = getFieldErrorId(fieldId);
              const error = getFieldErrorMessage(field.state.meta.errors);
              const showError =
                error !== undefined &&
                (field.state.meta.isTouched ||
                  field.form.state.submissionAttempts > 0);
              const filteredHeroes = heroes.filter(
                (hero) => hero.eventId === Number(selectedEventId)
              );

              let heroContent: ReactNode;
              if (heroesLoading) {
                heroContent = (
                  <p className="text-muted-foreground text-sm">Ładowanie...</p>
                );
              } else if (selectedEventId === "") {
                heroContent = (
                  <p className="text-muted-foreground text-sm">
                    Najpierw wybierz event
                  </p>
                );
              } else if (filteredHeroes.length === 0) {
                heroContent = (
                  <p className="text-muted-foreground text-sm">
                    Brak herosów w tym evencie
                  </p>
                );
              } else {
                heroContent = (
                  <HeroCardsGrid
                    fieldName={field.name}
                    heroes={filteredHeroes}
                    onBlur={field.handleBlur}
                    onSelectHero={field.handleChange}
                    selectedHeroId={field.state.value}
                  />
                );
              }

              return (
                <fieldset
                  aria-describedby={showError ? errorId : undefined}
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
                  {heroContent}
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
              const error = getFieldErrorMessage(field.state.meta.errors);
              const showError =
                error !== undefined &&
                (field.state.meta.isTouched ||
                  field.form.state.submissionAttempts > 0);
              return (
                <fieldset
                  aria-describedby={showError ? errorId : undefined}
                  aria-invalid={showError || undefined}
                  aria-labelledby={`${fieldId}-label`}
                  className="grid gap-2"
                  id={fieldId}
                >
                  <legend className="sr-only" id={`${fieldId}-label`}>
                    Gracze
                  </legend>
                  <HeroBetMemberPicker
                    fieldName={field.name}
                    idPrefix={fieldId}
                    lastBet={lastBet}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    selectedUserIds={[...field.state.value]}
                    users={[...users]}
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
  );
};

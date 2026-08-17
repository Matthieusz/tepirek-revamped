import type { ReactNode } from "react";

import { FormFieldFrame } from "@/components/forms/form-field-helpers";
import {
  getFieldErrorMessage,
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/form-field-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_FILTER } from "@/features/events/core/event-hero-filter";
import type {
  EventSelectOption,
  HeroSelectOption,
} from "@/features/events/core/event-hero-options";
import {
  getEventSelectDisplay,
  getHeroSelectDisplay,
} from "@/features/events/core/select-display";
import {
  EventSelectItems,
  HeroSelectItems,
} from "@/features/events/core/select-utils";

interface SelectFieldApi {
  readonly form: {
    readonly state: { readonly submissionAttempts: number };
  };
  readonly name: string;
  readonly state: {
    readonly meta: {
      readonly errors: readonly unknown[];
      readonly isTouched: boolean;
    };
    readonly value: string;
  };
  readonly handleBlur: () => void;
  readonly handleChange: (value: string) => void;
}

const getSelectFieldState = (field: SelectFieldApi) => {
  const fieldId = getFieldId(field.name);
  const errorId = getFieldErrorId(fieldId);
  const error = getFieldErrorMessage(field.state.meta.errors);
  const showError =
    error !== undefined &&
    (field.state.meta.isTouched || field.form.state.submissionAttempts > 0);

  return { error, errorId, fieldId, showError };
};

interface EventFormFieldProps {
  readonly events: EventSelectOption[];
  readonly eventsLoading: boolean;
  readonly field: SelectFieldApi;
  readonly onChange: (eventId: string) => void;
}

/** Renders the event select, including its field semantics and validation state. */
export const EventFormField = ({
  events,
  eventsLoading,
  field,
  onChange,
}: EventFormFieldProps): ReactNode => {
  const { error, errorId, fieldId, showError } = getSelectFieldState(field);

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
          if (value !== null) {
            onChange(value);
          }
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
            {getEventSelectDisplay({
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
};

interface HeroFormFieldProps {
  readonly eventId: string;
  readonly field: SelectFieldApi;
  readonly heroes: HeroSelectOption[];
  readonly heroesLoading: boolean;
}

/** Renders the event-scoped hero select, including its field semantics and validation state. */
export const HeroFormField = ({
  eventId,
  field,
  heroes,
  heroesLoading,
}: HeroFormFieldProps): ReactNode => {
  const { error, errorId, fieldId, showError } = getSelectFieldState(field);
  const value = eventId === ALL_FILTER ? ALL_FILTER : field.state.value;

  return (
    <FormFieldFrame
      error={showError ? error : undefined}
      fieldId={fieldId}
      label="Heros"
    >
      <Select
        disabled={eventId === ALL_FILTER || heroesLoading}
        name={field.name}
        onValueChange={(nextValue) => {
          if (nextValue !== null) {
            field.handleChange(nextValue);
          }
        }}
        value={value}
      >
        <SelectTrigger
          aria-describedby={showError ? errorId : undefined}
          aria-invalid={showError || undefined}
          className="w-full"
          id={fieldId}
          onBlur={field.handleBlur}
        >
          <SelectValue>
            {getHeroSelectDisplay({
              selectedEventId: eventId,
              selectedHeroId: field.state.value,
              sortedHeroes: heroes,
            })}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <HeroSelectItems
            allLabel="Wybierz herosa..."
            heroesLoading={heroesLoading}
            sortedHeroes={heroes}
          />
        </SelectContent>
      </Select>
    </FormFieldFrame>
  );
};

import { useAtomSet } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import { EVENT_ICON_OPTIONS } from "@tepirek-revamped/config";
import type { EventIconId } from "@tepirek-revamped/config";
import { format } from "date-fns";
import * as Schema from "effect/Schema";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback } from "@/components/forms/form";
import {
  FormFieldError,
  FormFieldFrame,
} from "@/components/forms/form-field-helpers";
import {
  getFieldErrorMessage,
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/form-field-utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { createEventAtom } from "@/features/events/core/event-atoms";
import {
  EventColorSchema,
  EventColors,
  EventDateSchema,
  EventFormDefaults,
  EventIconSchema,
  EventNameSchema,
} from "@/features/events/core/form-schemas";
import type { EventColor } from "@/features/events/core/form-schemas";
import { EVENT_ICON_MAP } from "@/lib/constants";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";
import { cn } from "@/lib/utils";

interface AddEventModalProps {
  readonly trigger: React.ReactNode;
}

const EventFormSchema = Schema.Struct({
  color: EventColorSchema,
  date: EventDateSchema,
  icon: EventIconSchema,
  name: EventNameSchema,
});
const EventFormValidator = Schema.toStandardSchemaV1(EventFormSchema);

interface EventFormValues {
  readonly color: EventColor;
  readonly date: Date | null;
  readonly icon: EventIconId;
  readonly name: string;
}

const eventDefaultValues: EventFormValues = {
  color: EventFormDefaults.color,
  date: EventFormDefaults.date,
  icon: EventFormDefaults.icon,
  name: EventFormDefaults.name,
};

export const AddEventModal = ({ trigger }: AddEventModalProps) => {
  const [open, setOpen] = useState(false);
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const createEvent = useAtomSet(createEventAtom, { mode: "promise" });
  const form = useAppForm({
    defaultValues: eventDefaultValues,
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded = await EventFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const result = await runFormSubmission(() =>
        createEvent({
          color: decoded.value.color,
          endTime: decoded.value.date,
          icon: decoded.value.icon,
          name: decoded.value.name,
        })
      );
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }

      toast.success("Event utworzony pomyślnie");
      form.reset();
      setOpen(false);
    },
    validators: { onSubmit: EventFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const selectedColor = useSelector(form.store, (state) => state.values.color);
  const canDiscard = !isSubmitting;

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      if (!canDiscard) {
        return;
      }
      form.reset();
      setSubmissionFailure(undefined);
    }
    setOpen(nextOpen);
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent
        description="Utwórz nowy event z nazwą i datą końcową."
        title="Dodaj nowy event"
        className="sm:max-w-106.25"
      >
        <form.AppForm>
          <Form form={form}>
            <div className="grid gap-4 py-4">
              <form.AppField name="name">
                {(field) => (
                  <field.TextField
                    label="Nazwa eventu"
                    placeholder="Wpisz nazwę eventu"
                  />
                )}
              </form.AppField>

              <form.Field name="icon">
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
                    >
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
                          Ikona eventu
                        </legend>
                        <div className="grid grid-cols-3 gap-2">
                          {EVENT_ICON_OPTIONS.map((item) => {
                            const IconComponent = EVENT_ICON_MAP[item.id];
                            return (
                              <button
                                aria-pressed={field.state.value === item.id}
                                className={cn(
                                  "hover:bg-muted/50 flex flex-col items-center gap-1 rounded-lg border p-3 transition-all",
                                  field.state.value === item.id
                                    ? "border-primary bg-primary/5 ring-primary ring-2"
                                    : "border-border"
                                )}
                                id={`${fieldId}-${item.id}`}
                                key={item.id}
                                name={field.name}
                                onBlur={field.handleBlur}
                                onClick={() => {
                                  field.handleChange(item.id);
                                }}
                                type="button"
                              >
                                <IconComponent
                                  className="size-5"
                                  style={{ color: selectedColor }}
                                />
                                <span className="text-xs">{item.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    </FormFieldFrame>
                  );
                }}
              </form.Field>

              <form.Field name="color">
                {(field) => {
                  const fieldId = getFieldId(field.name);
                  const error = getFieldErrorMessage(field.state.meta.errors);
                  const showError =
                    error !== undefined &&
                    (field.state.meta.isTouched ||
                      field.form.state.submissionAttempts > 0);
                  return (
                    <FormFieldFrame
                      error={showError ? error : undefined}
                      fieldId={fieldId}
                    >
                      <fieldset
                        aria-invalid={showError || undefined}
                        aria-labelledby={`${fieldId}-label`}
                        className="grid gap-2"
                        id={fieldId}
                      >
                        <legend
                          className="text-sm font-medium"
                          id={`${fieldId}-label`}
                        >
                          Kolor przewodni
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {EventColors.map((color) => (
                            <button
                              aria-label={`Wybierz kolor ${color.name}`}
                              aria-pressed={field.state.value === color.id}
                              className={cn(
                                "size-8 rounded-full border-2 transition-all",
                                field.state.value === color.id
                                  ? "border-foreground scale-110"
                                  : "border-transparent"
                              )}
                              id={`${fieldId}-${color.id.replaceAll("#", "")}`}
                              key={color.id}
                              name={field.name}
                              onBlur={field.handleBlur}
                              onClick={() => {
                                field.handleChange(color.id);
                              }}
                              style={{ backgroundColor: color.id }}
                              title={color.name}
                              type="button"
                            />
                          ))}
                        </div>
                      </fieldset>
                    </FormFieldFrame>
                  );
                }}
              </form.Field>

              <form.Field name="date">
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
                      label="Data końcowa"
                    >
                      <Popover>
                        <PopoverTrigger
                          render={
                            <Button
                              aria-describedby={showError ? errorId : undefined}
                              aria-invalid={showError || undefined}
                              className={cn(
                                "justify-start text-left font-normal",
                                !field.state.value && "text-muted-foreground"
                              )}
                              id={fieldId}
                              name={field.name}
                              onBlur={field.handleBlur}
                              variant="outline"
                            />
                          }
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {field.state.value
                            ? format(field.state.value, "PPP")
                            : "Wybierz datę"}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            onSelect={(date) => {
                              field.handleChange(date ?? null);
                            }}
                            selected={field.state.value ?? undefined}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormFieldError
                        error={showError ? error : undefined}
                        id={errorId}
                      />
                    </FormFieldFrame>
                  );
                }}
              </form.Field>
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
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Tworzenie..." : "Utwórz event"}
              </Button>
            </ResponsiveDialogFooter>
          </Form>
        </form.AppForm>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

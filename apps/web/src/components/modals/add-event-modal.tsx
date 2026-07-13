import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { EVENT_ICON_OPTIONS } from "@tepirek-revamped/config";
import type { EventIconId } from "@tepirek-revamped/config";
import { format } from "date-fns";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Calendar as CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  EffectForm,
  EffectFormFeedback,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
import {
  EffectFieldFrame,
  EffectTextField,
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/effect-form-fields";
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
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { EVENT_ICON_MAP } from "@/lib/constants";
import { createEventAtom } from "@/lib/event-atoms";
import {
  EventColorSchema,
  EventColors,
  EventDateSchema,
  EventFormDefaults,
  EventIconSchema,
  EventNameSchema,
} from "@/lib/form-schemas";
import type { EventColor } from "@/lib/form-schemas";
import { formSubmission } from "@/lib/form-submission";
import { cn } from "@/lib/utils";

interface AddEventModalProps {
  readonly trigger: React.ReactNode;
}

const eventFormBuilder = FormBuilder.empty
  .addField("name", EventNameSchema)
  .addField("icon", EventIconSchema)
  .addField("color", EventColorSchema)
  .addField("date", EventDateSchema);

interface IconFieldProps {
  readonly color: EventColor;
}

const IconField: FormReact.FieldComponent<EventIconId, IconFieldProps> = ({
  field,
  props,
}) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const hasError = Option.isSome(field.error);

  return (
    <EffectFieldFrame error={field.error} fieldId={fieldId}>
      <fieldset
        aria-describedby={hasError ? errorId : undefined}
        aria-invalid={hasError}
        aria-labelledby={`${fieldId}-label`}
        className="grid gap-2"
        id={fieldId}
      >
        <legend className="text-sm font-medium" id={`${fieldId}-label`}>
          Ikona eventu
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {EVENT_ICON_OPTIONS.map((item) => {
            const IconComponent = EVENT_ICON_MAP[item.id];
            return (
              <button
                aria-pressed={field.value === item.id}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 transition-all hover:bg-muted/50",
                  field.value === item.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-border"
                )}
                id={`${fieldId}-${item.id}`}
                key={item.id}
                name={field.path}
                onBlur={field.onBlur}
                onClick={() => field.onChange(item.id)}
                type="button"
              >
                <IconComponent
                  className="size-5"
                  style={{ color: props.color }}
                />
                <span className="text-xs">{item.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
    </EffectFieldFrame>
  );
};

const ColorField: FormReact.FieldComponent<
  EventColor,
  Record<never, never>
> = ({ field }) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const hasError = Option.isSome(field.error);

  return (
    <EffectFieldFrame error={field.error} fieldId={fieldId}>
      <fieldset
        aria-describedby={hasError ? errorId : undefined}
        aria-invalid={hasError}
        aria-labelledby={`${fieldId}-label`}
        className="grid gap-2"
        id={fieldId}
      >
        <legend className="text-sm font-medium" id={`${fieldId}-label`}>
          Kolor przewodni
        </legend>
        <div className="flex flex-wrap gap-2">
          {EventColors.map((color) => (
            <button
              aria-label={`Wybierz kolor ${color.name}`}
              aria-pressed={field.value === color.id}
              className={cn(
                "size-8 rounded-full border-2 transition-all",
                field.value === color.id
                  ? "scale-110 border-foreground"
                  : "border-transparent"
              )}
              id={`${fieldId}-${color.id.replaceAll("#", "")}`}
              key={color.id}
              name={field.path}
              onBlur={field.onBlur}
              onClick={() => field.onChange(color.id)}
              style={{ backgroundColor: color.id }}
              title={color.name}
              type="button"
            />
          ))}
        </div>
      </fieldset>
    </EffectFieldFrame>
  );
};

const DateField: FormReact.FieldComponent<
  Date | null,
  Record<never, never>
> = ({ field }) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const hasError = Option.isSome(field.error);
  return (
    <EffectFieldFrame
      error={field.error}
      fieldId={fieldId}
      label="Data końcowa"
    >
      <Popover>
        <PopoverTrigger
          render={
            <Button
              aria-describedby={hasError ? errorId : undefined}
              aria-invalid={hasError}
              className={cn(
                "justify-start text-left font-normal",
                !field.value && "text-muted-foreground"
              )}
              id={fieldId}
              name={field.path}
              onBlur={field.onBlur}
              variant="outline"
            >
              <CalendarIcon className="mr-2 size-4" />
              {field.value ? format(field.value, "PPP") : "Wybierz datę"}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            onSelect={(date) => field.onChange(date ?? null)}
            selected={field.value ?? undefined}
          />
        </PopoverContent>
      </Popover>
    </EffectFieldFrame>
  );
};

interface EventSubmission {
  readonly color: EventColor;
  readonly endTime: Date;
  readonly icon: EventIconId;
  readonly name: string;
}

type CreateEvent = (payload: EventSubmission) => Promise<unknown>;

const eventForm = FormReact.make(eventFormBuilder, {
  fields: {
    color: ColorField,
    date: DateField,
    icon: IconField,
    name: EffectTextField,
  },
  mode: { validation: "onSubmit" },
  onSubmit: (createEvent: CreateEvent, { decoded }) =>
    formSubmission(() =>
      createEvent({
        color: decoded.color,
        endTime: decoded.date,
        icon: decoded.icon,
        name: decoded.name,
      })
    ),
});

export const AddEventModal = ({ trigger }: AddEventModalProps) => {
  const [open, setOpen] = useState(false);
  const createEvent = useAtomSet(createEventAtom, { mode: "promise" });
  const submit = useAtomSet(eventForm.submit, { mode: "promise" });
  const reset = useAtomSet(eventForm.reset);
  const submitResult = useAtomValue(eventForm.submit);
  const isDirty = useAtomValue(eventForm.isDirty);
  const canDiscard = useEffectFormProtection(isDirty, submitResult.waiting);

  useEffect(() => {
    if (AsyncResult.isSuccess(submitResult)) {
      toast.success("Event utworzony pomyślnie");
      reset();
      setOpen(false);
    }
  }, [reset, submitResult]);

  const handleSubmit = async (): Promise<void> => {
    try {
      await submit(createEvent);
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
  const values = useAtomValue(eventForm.values);
  const selectedColor = Option.match(values, {
    onNone: () => "#6366f1" as const,
    onSome: (formValues) => formValues.color,
  });

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-106.25">
        <eventForm.Initialize defaultValues={EventFormDefaults}>
          <EffectForm action={handleSubmit} submitResult={submitResult}>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Dodaj nowy event</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Utwórz nowy event z nazwą i datą końcową.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <eventForm.name
                  label="Nazwa eventu"
                  placeholder="Wpisz nazwę eventu"
                />
              </div>

              <eventForm.icon color={selectedColor} />
              <eventForm.color />
              <eventForm.date />
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
              <Button disabled={submitResult.waiting} type="submit">
                {submitResult.waiting ? "Tworzenie..." : "Utwórz event"}
              </Button>
            </ResponsiveDialogFooter>
          </EffectForm>
        </eventForm.Initialize>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

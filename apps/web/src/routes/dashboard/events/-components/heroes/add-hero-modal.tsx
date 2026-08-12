import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback, useCanCloseForm } from "@/components/forms/form";
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
  HeroEventIdSchema,
  HeroNameSchema,
} from "@/features/events/heroes/form-schemas";
import { createHeroAtom } from "@/features/events/heroes/hero-atoms";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";

interface AddHeroModalProps {
  readonly trigger: React.ReactNode;
}

const HeroFormSchema = Schema.Struct({
  eventId: HeroEventIdSchema,
  image: Schema.String,
  level: Schema.Finite,
  name: HeroNameSchema,
});
const HeroFormValidator = Schema.toStandardSchemaV1(HeroFormSchema);

export const AddHeroModal = ({ trigger }: AddHeroModalProps) => {
  const [open, setOpen] = useState(false);
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const createHero = useAtomSet(createHeroAtom, { mode: "promise" });
  const eventsResult = useAtomValue(eventsAtom);
  const events = AsyncResult.isSuccess(eventsResult)
    ? [...eventsResult.value]
    : [];
  const eventsLoading = !AsyncResult.isSuccess(eventsResult);
  const form = useAppForm({
    defaultValues: { eventId: "", image: "", level: 1, name: "" },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded = await HeroFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const result = await runFormSubmission(() => {
        const heroPayload = {
          eventId: decoded.value.eventId,
          level: decoded.value.level,
          name: decoded.value.name,
        };
        if (decoded.value.image) {
          return createHero({ ...heroPayload, image: decoded.value.image });
        }
        return createHero(heroPayload);
      });
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }

      toast.success("Heros utworzony pomyślnie");
      form.reset();
      setSubmissionFailure(undefined);
      setOpen(false);
    },
    validators: { onSubmit: HeroFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const canDiscard = useCanCloseForm(isSubmitting);
  let submitLabel = "Utwórz herosa";
  if (eventsLoading) {
    submitLabel = "Ładowanie...";
  } else if (isSubmitting) {
    submitLabel = "Tworzenie...";
  }

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

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-106.25">
        <form.AppForm>
          <Form form={form}>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Dodaj nowego herosa</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Utwórz nowego herosa do wybranego eventu.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="grid gap-4 py-4">
              <form.AppField name="name">
                {(field) => (
                  <field.TextField
                    label="Nazwa herosa"
                    placeholder="Wprowadź nazwę herosa"
                  />
                )}
              </form.AppField>
              <form.AppField name="image">
                {(field) => (
                  <field.TextField
                    label="URL obrazka (opcjonalnie)"
                    placeholder="Wprowadź URL obrazka"
                  />
                )}
              </form.AppField>
              <form.AppField name="level">
                {(field) => (
                  <field.NumberField
                    label="Poziom"
                    placeholder="Wprowadź poziom"
                  />
                )}
              </form.AppField>
              <form.AppField name="eventId">
                {(field) => (
                  <field.StringSelectField
                    disabled={eventsLoading}
                    label="Event"
                    loading={eventsLoading}
                    options={events.map((event) => ({
                      label: event.name,
                      value: event.id.toString(),
                    }))}
                    placeholder="Wybierz event"
                  />
                )}
              </form.AppField>
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
              <Button disabled={isSubmitting || eventsLoading} type="submit">
                {submitLabel}
              </Button>
            </ResponsiveDialogFooter>
          </Form>
        </form.AppForm>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

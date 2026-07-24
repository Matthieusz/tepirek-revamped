import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  EffectForm,
  EffectFormFeedback,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
import {
  EffectNumberField,
  EffectStringSelectField,
  EffectTextField,
} from "@/components/forms/effect-form-fields";
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
import { createHeroAtom } from "@/features/events/heroes/hero-atoms";
import { HeroEventIdSchema, HeroNameSchema } from "@/lib/form-schemas";
import { formSubmission } from "@/lib/form-submission";

interface AddHeroModalProps {
  readonly trigger: React.ReactNode;
}

const heroFormBuilder = FormBuilder.empty
  .addField("name", HeroNameSchema)
  .addField("image", Schema.String)
  .addField("level", Schema.Finite)
  .addField("eventId", HeroEventIdSchema);

interface HeroSubmission {
  readonly eventId: number;
  readonly image?: string;
  readonly level: number;
  readonly name: string;
}

type CreateHero = (payload: HeroSubmission) => Promise<unknown>;

const heroForm = FormReact.make(heroFormBuilder, {
  fields: {
    eventId: EffectStringSelectField,
    image: EffectTextField,
    level: EffectNumberField,
    name: EffectTextField,
  },
  mode: { validation: "onSubmit" },
  onSubmit: (createHero: CreateHero, { decoded }) =>
    formSubmission(() =>
      createHero({
        eventId: decoded.eventId,
        ...(decoded.image ? { image: decoded.image } : {}),
        level: decoded.level,
        name: decoded.name,
      })
    ),
});

export const AddHeroModal = ({ trigger }: AddHeroModalProps) => {
  const [open, setOpen] = useState(false);
  const createHero = useAtomSet(createHeroAtom, { mode: "promise" });
  const eventsResult = useAtomValue(eventsAtom);
  const events = AsyncResult.isSuccess(eventsResult)
    ? [...eventsResult.value]
    : [];
  const eventsLoading = !AsyncResult.isSuccess(eventsResult);
  const submit = useAtomSet(heroForm.submit, { mode: "promise" });
  const reset = useAtomSet(heroForm.reset);
  const submitResult = useAtomValue(heroForm.submit);
  const isDirty = useAtomValue(heroForm.isDirty);
  const canDiscard = useEffectFormProtection(isDirty, submitResult.waiting);
  let submitLabel = "Utwórz herosa";
  if (eventsLoading) {
    submitLabel = "Ładowanie...";
  }
  if (submitResult.waiting) {
    submitLabel = "Tworzenie...";
  }

  useEffect(() => {
    if (AsyncResult.isSuccess(submitResult)) {
      toast.success("Heros utworzony pomyślnie");
      reset();
      setOpen(false);
    }
  }, [reset, submitResult]);

  const handleSubmit = async (): Promise<void> => {
    try {
      await submit(createHero);
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

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-106.25">
        <heroForm.Initialize
          defaultValues={{ eventId: "", image: "", level: 1, name: "" }}
        >
          <EffectForm action={handleSubmit} submitResult={submitResult}>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Dodaj nowego herosa</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Utwórz nowego herosa do wybranego eventu.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="grid gap-4 py-4">
              <heroForm.name
                label="Nazwa herosa"
                placeholder="Wprowadź nazwę herosa"
              />
              <heroForm.image
                label="URL obrazka (opcjonalnie)"
                placeholder="Wprowadź URL obrazka"
              />
              <heroForm.level label="Poziom" placeholder="Wprowadź poziom" />
              <heroForm.eventId
                disabled={eventsLoading}
                label="Event"
                loading={eventsLoading}
                options={events.map((event) => ({
                  label: event.name,
                  value: event.id.toString(),
                }))}
                placeholder="Wybierz event"
              />
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
                disabled={submitResult.waiting || eventsLoading}
                type="submit"
              >
                {submitLabel}
              </Button>
            </ResponsiveDialogFooter>
          </EffectForm>
        </heroForm.Initialize>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

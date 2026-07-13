import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useState } from "react";
import { toast } from "sonner";

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
import { eventsAtom } from "@/lib/event-atoms";
import { HeroEventIdSchema, HeroNameSchema } from "@/lib/form-schemas";
import { formSubmission } from "@/lib/form-submission";
import { createHeroAtom } from "@/lib/hero-atoms";

interface AddHeroModalProps {
  readonly trigger: React.ReactNode;
}

const heroFormBuilder = FormBuilder.empty
  .addField("name", HeroNameSchema)
  .addField("image", Schema.String)
  .addField("level", Schema.Number)
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
        eventId: Number.parseInt(decoded.eventId, 10),
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
    ? Array.from(eventsResult.value)
    : [];
  const eventsLoading = !AsyncResult.isSuccess(eventsResult);
  const submit = useAtomSet(heroForm.submit, { mode: "promise" });
  const reset = useAtomSet(heroForm.reset);
  const submitResult = useAtomValue(heroForm.submit);
  let submitLabel = "Utwórz herosa";
  if (eventsLoading) {
    submitLabel = "Ładowanie...";
  }
  if (submitResult.waiting) {
    submitLabel = "Tworzenie...";
  }

  const handleSubmit = async () => {
    await submit(createHero);
    toast.success("Heros utworzony pomyślnie");
    reset();
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
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
          <form action={handleSubmit}>
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
          </form>
        </heroForm.Initialize>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

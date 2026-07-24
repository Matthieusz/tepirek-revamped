import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { CreateAnnouncementPayload } from "@tepirek-revamped/api/protocol/announcement/http-api-contract";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  EffectForm,
  EffectFormFeedback,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
import {
  EffectTextField,
  EffectTextareaField,
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
import { createAnnouncementAtom } from "@/features/announcements/announcement-atoms";
import { formSubmission } from "@/lib/form-submission";

interface AddAnnouncementModalProps {
  readonly trigger: React.ReactNode;
}

const announcementFormBuilder = FormBuilder.empty
  .addField("title", CreateAnnouncementPayload.fields.title)
  .addField("description", CreateAnnouncementPayload.fields.description);

type CreateAnnouncement = (
  payload: CreateAnnouncementPayload
) => Promise<unknown>;

const announcementForm = FormReact.make(announcementFormBuilder, {
  fields: {
    description: EffectTextareaField,
    title: EffectTextField,
  },
  mode: { validation: "onSubmit" },
  onSubmit: (createAnnouncement: CreateAnnouncement, { decoded }) =>
    formSubmission(() => createAnnouncement(decoded)),
});

export const AddAnnouncementModal = ({
  trigger,
}: AddAnnouncementModalProps) => {
  const [open, setOpen] = useState(false);
  const createAnnouncement = useAtomSet(createAnnouncementAtom, {
    mode: "promise",
  });
  const submit = useAtomSet(announcementForm.submit);
  const reset = useAtomSet(announcementForm.reset);
  const submitResult = useAtomValue(announcementForm.submit);
  const isDirty = useAtomValue(announcementForm.isDirty);
  const canDiscard = useEffectFormProtection(isDirty, submitResult.waiting);

  useEffect(() => {
    if (AsyncResult.isSuccess(submitResult)) {
      toast.success("Ogłoszenie utworzone pomyślnie");
      reset();
      setOpen(false);
    }
  }, [reset, submitResult]);

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
      <ResponsiveDialogContent className="sm:max-w-150">
        <announcementForm.Initialize
          defaultValues={{ description: "", title: "" }}
        >
          <EffectForm
            action={() => submit(() => createAnnouncement)}
            submitResult={submitResult}
          >
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                Dodaj nowe ogłoszenie
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Utwórz nowe ogłoszenie z tytułem i opisem.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="grid gap-4 py-4">
              <announcementForm.title
                label="Tytuł ogłoszenia"
                placeholder="Wpisz tytuł ogłoszenia"
              />
              <announcementForm.description
                label="Opis ogłoszenia"
                placeholder="Wpisz opis ogłoszenia"
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
              <Button disabled={submitResult.waiting} type="submit">
                {submitResult.waiting ? "Tworzenie..." : "Dodaj ogłoszenie"}
              </Button>
            </ResponsiveDialogFooter>
          </EffectForm>
        </announcementForm.Initialize>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

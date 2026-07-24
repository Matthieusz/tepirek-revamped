import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { CreateRangePayload } from "@tepirek-revamped/api/protocol/skills/http-api-contract";
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
import { createSkillRangeAtom } from "@/features/skills/skill-atoms";
import { formSubmission } from "@/lib/form-submission";

interface AddRangeModalProps {
  readonly trigger: React.ReactNode;
}

const rangeFormBuilder = FormBuilder.empty
  .addField("name", CreateRangePayload.fields.name)
  .addField("level", CreateRangePayload.fields.level)
  .addField("image", CreateRangePayload.fields.image);

type CreateRange = (payload: CreateRangePayload) => Promise<unknown>;

const rangeForm = FormReact.make(rangeFormBuilder, {
  fields: {
    image: EffectTextField,
    level: EffectNumberField,
    name: EffectTextField,
  },
  mode: { validation: "onSubmit" },
  onSubmit: (createRange: CreateRange, { decoded }) =>
    formSubmission(() => createRange(decoded)),
});

export const AddRangeModal = ({ trigger }: AddRangeModalProps) => {
  const [open, setOpen] = useState(false);
  const createSkillRange = useAtomSet(createSkillRangeAtom, {
    mode: "promise",
  });
  const submit = useAtomSet(rangeForm.submit);
  const reset = useAtomSet(rangeForm.reset);
  const submitResult = useAtomValue(rangeForm.submit);
  const isDirty = useAtomValue(rangeForm.isDirty);
  const canDiscard = useEffectFormProtection(isDirty, submitResult.waiting);

  useEffect(() => {
    if (AsyncResult.isSuccess(submitResult)) {
      toast.success("Przedział utworzony pomyślnie");
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
      <ResponsiveDialogContent className="sm:max-w-106.25">
        <rangeForm.Initialize defaultValues={{ image: "", level: 1, name: "" }}>
          <EffectForm
            action={() => submit(() => createSkillRange)}
            submitResult={submitResult}
          >
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                Dodaj nowy przedział
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Utwórz nowy przedział z nazwą i poziomem.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="grid gap-4 py-4">
              <rangeForm.name
                label="Nazwa przedziału"
                placeholder="Wpisz nazwę przedziału"
              />
              <rangeForm.level label="Poziom" placeholder="Wpisz poziom" />
              <rangeForm.image
                label="URL obrazka"
                placeholder="Wpisz URL obrazka"
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
                {submitResult.waiting ? "Tworzenie..." : "Utwórz przedział"}
              </Button>
            </ResponsiveDialogFooter>
          </EffectForm>
        </rangeForm.Initialize>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { CreateProfessionPayload } from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EffectTextField } from "@/components/forms/effect-form-fields";
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
import { formSubmission } from "@/lib/form-submission";
import { createSkillProfessionAtom } from "@/lib/skill-atoms";

interface AddProfessionModalProps {
  readonly trigger: React.ReactNode;
}

const professionFormBuilder = FormBuilder.empty.addField(
  "name",
  CreateProfessionPayload.fields.name
);

type CreateProfession = (
  payload: typeof CreateProfessionPayload.Type
) => Promise<unknown>;

const professionForm = FormReact.make(professionFormBuilder, {
  fields: { name: EffectTextField },
  mode: { validation: "onSubmit" },
  onSubmit: (createProfession: CreateProfession, { decoded }) =>
    formSubmission(() => createProfession(decoded)),
});

export const AddProfessionModal = ({ trigger }: AddProfessionModalProps) => {
  const [open, setOpen] = useState(false);
  const createSkillProfession = useAtomSet(createSkillProfessionAtom, {
    mode: "promise",
  });
  const submit = useAtomSet(professionForm.submit);
  const reset = useAtomSet(professionForm.reset);
  const submitResult = useAtomValue(professionForm.submit);

  useEffect(() => {
    if (AsyncResult.isSuccess(submitResult)) {
      toast.success("Profesja utworzona");
      reset();
      setOpen(false);
    }
  }, [reset, submitResult]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
    }
    setOpen(nextOpen);
  };

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-[425px]">
        <professionForm.Initialize defaultValues={{ name: "" }}>
          <form action={() => submit(() => createSkillProfession)}>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Dodaj profesję</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Utwórz nową profesję.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="grid gap-4 py-4">
              <professionForm.name
                label="Nazwa"
                placeholder="Wpisz nazwę profesji"
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
              <Button disabled={submitResult.waiting} type="submit">
                {submitResult.waiting ? "Tworzenie..." : "Utwórz profesję"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </professionForm.Initialize>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

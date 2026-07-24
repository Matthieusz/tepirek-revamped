import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  EffectForm,
  EffectFormFeedback,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
import {
  EffectCheckboxField,
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
import {
  createSkillAtom,
  skillProfessionsAtom,
} from "@/features/skills/skill-atoms";
import {
  SkillLinkSchema,
  SkillNameSchema,
  SkillProfessionIdSchema,
} from "@/lib/form-schemas";
import { formSubmission } from "@/lib/form-submission";

interface AddSkillModalProps {
  readonly trigger: React.ReactNode;
  readonly defaultRangeId: number;
  readonly defaultProfessionId?: number;
}

const skillFormBuilder = FormBuilder.empty
  .addField("link", SkillLinkSchema)
  .addField("name", SkillNameSchema)
  .addField("mastery", Schema.Boolean)
  .addField("professionId", SkillProfessionIdSchema);

interface SkillSubmission {
  readonly link: string;
  readonly mastery: boolean;
  readonly name: string;
  readonly professionId: number;
  readonly rangeId: number;
}

type CreateSkill = (submission: SkillSubmission) => Promise<unknown>;

interface SkillSubmitArgs {
  readonly createSkill: CreateSkill;
  readonly rangeId: number;
}

export const AddSkillModal = ({
  trigger,
  defaultRangeId,
  defaultProfessionId,
}: AddSkillModalProps) => {
  const [open, setOpen] = useState(false);
  const createSkill = useAtomSet(createSkillAtom, { mode: "promise" });
  const professionsResult = useAtomValue(skillProfessionsAtom);
  const professionsData = AsyncResult.isSuccess(professionsResult)
    ? professionsResult.value
    : [];
  const professionsLoading = !AsyncResult.isSuccess(professionsResult);
  const form = useMemo(
    () =>
      FormReact.make(skillFormBuilder, {
        fields: {
          link: EffectTextField,
          mastery: EffectCheckboxField,
          name: EffectTextField,
          professionId: EffectStringSelectField,
        },
        mode: { validation: "onSubmit" },
        onSubmit: (submitArgs: SkillSubmitArgs, { decoded }) =>
          formSubmission(() =>
            submitArgs.createSkill({
              link: decoded.link,
              mastery: decoded.mastery,
              name: decoded.name,
              professionId: decoded.professionId,
              rangeId: submitArgs.rangeId,
            })
          ),
      }),
    []
  );
  const submit = useAtomSet(form.submit);
  const reset = useAtomSet(form.reset);
  const submitResult = useAtomValue(form.submit);
  const isDirty = useAtomValue(form.isDirty);
  const canDiscard = useEffectFormProtection(isDirty, submitResult.waiting);
  let submitLabel = "Utwórz zestaw";
  if (professionsLoading) {
    submitLabel = "Ładowanie...";
  }
  if (submitResult.waiting) {
    submitLabel = "Tworzenie...";
  }

  useEffect(() => {
    if (AsyncResult.isSuccess(submitResult)) {
      toast.success("Zestaw utworzony");
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
        <form.Initialize
          defaultValues={{
            link: "",
            mastery: false,
            name: "",
            professionId:
              defaultProfessionId === undefined
                ? ""
                : String(defaultProfessionId),
          }}
          key={defaultProfessionId ?? "no-default-profession"}
        >
          <EffectForm
            action={() => submit({ createSkill, rangeId: defaultRangeId })}
            submitResult={submitResult}
          >
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                Dodaj zestaw umiejętności
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Utwórz nowy zestaw umiejętności w tym przedziale.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="grid gap-4 py-4">
              <form.link
                label="Link"
                placeholder="https://margoworld.pl/tools/skills#AyKaZmAA/iA="
              />
              <form.name
                label="Nazwa"
                placeholder="Wpisz nazwę zestawu umiejętności"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <form.professionId
                  disabled={professionsLoading}
                  label="Profesja"
                  loading={professionsLoading}
                  options={professionsData.map((profession) => ({
                    label: profession.name,
                    value: profession.id.toString(),
                  }))}
                  placeholder="Wybierz profesję"
                />
                <form.mastery label="Mistrzostwo?" />
              </div>
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
                disabled={submitResult.waiting || professionsLoading}
                type="submit"
              >
                {submitLabel}
              </Button>
            </ResponsiveDialogFooter>
          </EffectForm>
        </form.Initialize>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

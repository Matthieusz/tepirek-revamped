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
import {
  SkillLinkSchema,
  SkillNameSchema,
  SkillProfessionIdSchema,
} from "@/features/skills/form-schemas";
import {
  createSkillAtom,
  skillProfessionsAtom,
} from "@/features/skills/skill-atoms";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";

interface AddSkillModalProps {
  readonly trigger: React.ReactNode;
  readonly defaultRangeId: number;
  readonly defaultProfessionId?: number;
}

const SkillFormSchema = Schema.Struct({
  link: SkillLinkSchema,
  mastery: Schema.Boolean,
  name: SkillNameSchema,
  professionId: SkillProfessionIdSchema,
});
const SkillFormValidator = Schema.toStandardSchemaV1(SkillFormSchema);

const AddSkillModalContent = ({
  trigger,
  defaultRangeId,
  defaultProfessionId,
}: AddSkillModalProps) => {
  const [open, setOpen] = useState(false);
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const createSkill = useAtomSet(createSkillAtom, { mode: "promise" });
  const professionsResult = useAtomValue(skillProfessionsAtom);
  const professionsData = AsyncResult.isSuccess(professionsResult)
    ? professionsResult.value
    : [];
  const professionsLoading = !AsyncResult.isSuccess(professionsResult);
  const form = useAppForm({
    defaultValues: {
      link: "",
      mastery: false,
      name: "",
      professionId:
        defaultProfessionId === undefined ? "" : String(defaultProfessionId),
    },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded = await SkillFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const result = await runFormSubmission(() =>
        createSkill({
          link: decoded.value.link,
          mastery: decoded.value.mastery,
          name: decoded.value.name,
          professionId: decoded.value.professionId,
          rangeId: defaultRangeId,
        })
      );
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }

      toast.success("Zestaw utworzony");
      form.reset();
      setOpen(false);
    },
    validators: { onSubmit: SkillFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const canDiscard = useCanCloseForm(isSubmitting);

  let submitLabel = "Utwórz zestaw";
  if (professionsLoading) {
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
              <ResponsiveDialogTitle>
                Dodaj zestaw umiejętności
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Utwórz nowy zestaw umiejętności w tym przedziale.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="grid gap-4 py-4">
              <form.AppField name="link">
                {(field) => (
                  <field.TextField
                    label="Link"
                    placeholder="https://margoworld.pl/tools/skills#AyKaZmAA/iA="
                  />
                )}
              </form.AppField>
              <form.AppField name="name">
                {(field) => (
                  <field.TextField
                    label="Nazwa"
                    placeholder="Wpisz nazwę zestawu umiejętności"
                  />
                )}
              </form.AppField>
              <div className="grid gap-4 sm:grid-cols-2">
                <form.AppField name="professionId">
                  {(field) => (
                    <field.StringSelectField
                      disabled={professionsLoading}
                      label="Profesja"
                      loading={professionsLoading}
                      options={professionsData.map((profession) => ({
                        label: profession.name,
                        value: profession.id.toString(),
                      }))}
                      placeholder="Wybierz profesję"
                    />
                  )}
                </form.AppField>
                <form.AppField name="mastery">
                  {(field) => <field.CheckboxField label="Mistrzostwo?" />}
                </form.AppField>
              </div>
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
              <Button
                disabled={isSubmitting || professionsLoading}
                type="submit"
              >
                {submitLabel}
              </Button>
            </ResponsiveDialogFooter>
          </Form>
        </form.AppForm>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export const AddSkillModal = (props: AddSkillModalProps) => (
  <AddSkillModalContent key={props.defaultProfessionId ?? "none"} {...props} />
);

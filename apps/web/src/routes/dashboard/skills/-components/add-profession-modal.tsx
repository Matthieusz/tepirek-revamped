import { useAtomSet } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import { CreateProfessionPayload } from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import * as Schema from "effect/Schema";
import { useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback, useCanCloseForm } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { createSkillProfessionAtom } from "@/features/skills/skill-atoms";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";

interface AddProfessionModalProps {
  readonly trigger: React.ReactNode;
}

const ProfessionFormSchema = Schema.Struct({
  name: CreateProfessionPayload.fields.name,
});
const ProfessionFormValidator = Schema.toStandardSchemaV1(ProfessionFormSchema);

export const AddProfessionModal = ({ trigger }: AddProfessionModalProps) => {
  const [open, setOpen] = useState(false);
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const createSkillProfession = useAtomSet(createSkillProfessionAtom, {
    mode: "promise",
  });
  const form = useAppForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded =
        await ProfessionFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const result = await runFormSubmission(() =>
        createSkillProfession(decoded.value)
      );
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }

      toast.success("Profesja utworzona");
      form.reset();
      setOpen(false);
    },
    validators: { onSubmit: ProfessionFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const canDiscard = useCanCloseForm(isSubmitting);

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
      <ResponsiveDialogContent
        description="Utwórz nową profesję."
        title="Dodaj profesję"
        className="sm:max-w-[425px]"
      >
        <form.AppForm>
          <Form form={form}>
            <div className="grid gap-4 py-4">
              <form.AppField name="name">
                {(field) => (
                  <field.TextField
                    label="Nazwa"
                    placeholder="Wpisz nazwę profesji"
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
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Tworzenie..." : "Utwórz profesję"}
              </Button>
            </ResponsiveDialogFooter>
          </Form>
        </form.AppForm>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

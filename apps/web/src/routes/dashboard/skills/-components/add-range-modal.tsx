import { useSelector } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateRangePayload } from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import * as Predicate from "effect/Predicate";
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
import { createSkillRangeMutationOptions } from "@/features/skills/skill-queries";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";

interface AddRangeModalProps {
  readonly trigger: React.ReactNode;
}

const RangeFormSchema = Schema.Struct({
  image: CreateRangePayload.fields.image,
  level: Schema.FiniteFromString.check(
    Schema.isInt(),
    Schema.isBetween({ maximum: 300, minimum: 1 })
  ),
  name: CreateRangePayload.fields.name,
});

const RangeFormValidator = Schema.toStandardSchemaV1(RangeFormSchema);

export const AddRangeModal = ({ trigger }: AddRangeModalProps) => {
  const [open, setOpen] = useState(false);

  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();

  const queryClient = useQueryClient();

  const createSkillRange = useMutation(
    createSkillRangeMutationOptions(queryClient, undefined, {
      onRefreshError: () => {
        toast.error(
          "Przedział został utworzony, ale lista nie została odświeżona."
        );
      },
    })
  );

  const form = useAppForm({
    defaultValues: { image: "", level: "1", name: "" },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded = await RangeFormValidator["~standard"].validate(value);

      if (!("value" in decoded)) {
        return;
      }

      const result = await runFormSubmission(async () => {
        await createSkillRange.mutateAsync(decoded.value);
      });

      if (Predicate.isTagged("failure")(result)) {
        setSubmissionFailure(result.error);

        return;
      }

      toast.success("Przedział utworzony pomyślnie");
      form.reset();
      setOpen(false);
    },
    validators: { onSubmit: RangeFormValidator },
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
        description="Utwórz nowy przedział z nazwą i poziomem."
        title="Dodaj nowy przedział"
        className="sm:max-w-106.25"
      >
        <form.AppForm>
          <Form form={form}>
            <div className="grid gap-4 py-4">
              <form.AppField name="name">
                {(field) => (
                  <field.TextField
                    label="Nazwa przedziału"
                    placeholder="Wpisz nazwę przedziału"
                  />
                )}
              </form.AppField>
              <form.AppField name="level">
                {(field) => (
                  <field.NumberField
                    label="Poziom"
                    placeholder="Wpisz poziom"
                  />
                )}
              </form.AppField>
              <form.AppField name="image">
                {(field) => (
                  <field.TextField
                    label="URL obrazka"
                    placeholder="Wpisz URL obrazka"
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
                {isSubmitting ? "Tworzenie..." : "Utwórz przedział"}
              </Button>
            </ResponsiveDialogFooter>
          </Form>
        </form.AppForm>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

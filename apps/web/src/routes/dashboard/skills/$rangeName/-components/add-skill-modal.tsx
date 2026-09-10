import { useSelector } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import { useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback, useCanCloseForm } from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import {
  SkillLinkSchema,
  SkillNameSchema,
  SkillProfessionIdSchema,
} from "@/features/skills/form-schemas";
import {
  createSkillMutationOptions,
  skillProfessionsQueryOptions,
} from "@/features/skills/skill-queries";
import { getErrorMessage } from "@/lib/errors";
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

  const queryClient = useQueryClient();

  const createSkill = useMutation(
    createSkillMutationOptions(queryClient, undefined, {
      onRefreshError: () => {
        toast.error(
          "Zestaw został utworzony, ale lista nie została odświeżona."
        );
      },
    })
  );

  const professionsQuery = useQuery(skillProfessionsQueryOptions());
  const professionsData = professionsQuery.data ?? [];
  const professionsLoading = professionsQuery.isPending;

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

      const result = await runFormSubmission(async () => {
        await createSkill.mutateAsync({
          link: decoded.value.link,
          mastery: decoded.value.mastery,
          name: decoded.value.name,
          professionId: decoded.value.professionId,
          rangeId: defaultRangeId,
        });
      });

      if (Predicate.isTagged("failure")(result)) {
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
  } else if (professionsQuery.isError) {
    submitLabel = "Niedostępne";
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
      <ResponsiveDialogContent
        description="Utwórz nowy zestaw umiejętności w tym przedziale."
        title="Dodaj zestaw umiejętności"
        className="sm:max-w-106.25"
      >
        <form.AppForm>
          <Form form={form}>
            {professionsQuery.isError && (
              <QueryErrorState
                message={getErrorMessage(
                  professionsQuery.error,
                  "Nie udało się wczytać profesji."
                )}
                onRetry={() => {
                  void professionsQuery.refetch();
                }}
              />
            )}
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
                disabled={
                  isSubmitting || professionsLoading || professionsQuery.isError
                }
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

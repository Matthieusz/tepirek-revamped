import {
  Add01Icon,
  Cancel01Icon,
  LoaderCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSelector } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import { useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback } from "@/components/forms/form";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { createSquadGroupMutationOptions } from "@/features/squad-builder/squad-group-queries";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";

interface CreateSquadGroupFrameProps {
  readonly onClose: () => void;
}

const CreateSquadGroupFormSchema = Schema.Struct({
  name: Schema.String.pipe(
    Schema.refine((value): value is string => value.trim().length > 0, {
      message: "Podaj nazwę grupy",
    }),
    Schema.refine((value): value is string => value.length <= 80, {
      message: "Nazwa grupy może mieć maksymalnie 80 znaków",
    })
  ),
});

const CreateSquadGroupFormValidator = Schema.toStandardSchemaV1(
  CreateSquadGroupFormSchema
);

export const CreateSquadGroupFrame = ({
  onClose,
}: CreateSquadGroupFrameProps) => {
  const navigate = useNavigate();

  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();

  const queryClient = useQueryClient();

  const createSquadGroup = useMutation(
    createSquadGroupMutationOptions(queryClient)
  );

  const form = useAppForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);

      const decoded =
        await CreateSquadGroupFormValidator["~standard"].validate(value);

      if (!("value" in decoded)) {
        return;
      }

      const result = await runFormSubmission(
        async () =>
          await createSquadGroup.mutateAsync({
            name: decoded.value.name.trim(),
          })
      );

      if (Predicate.isTagged("failure")(result)) {
        setSubmissionFailure(result.error);

        return;
      }

      toast.success("Grupa składów została utworzona");
      await navigate({
        params: { groupId: String(result.value.groupId) },
        to: "/dashboard/squad-builder/squads/$groupId",
      });
    },
    validators: { onSubmit: CreateSquadGroupFormValidator },
  });

  const isCreating = useSelector(form.store, (state) => state.isSubmitting);
  const name = useSelector(form.store, (state) => state.values.name);

  return (
    <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
      <FramePanel className="p-0 shadow-none">
        <form.AppForm>
          <Form className="space-y-2 p-4" form={form}>
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  autoComplete="off"
                  autoFocus
                  disabled={isCreating}
                  id="new-squad-group-name"
                  label="Nazwa nowej grupy składów"
                  maxLength={80}
                  onKeyDown={(event) => {
                    if (
                      Predicate.isTagged("Escape")(event) &&
                      name.trim().length === 0 &&
                      !isCreating
                    ) {
                      onClose();
                    }
                  }}
                  placeholder="Np. Kolos tygodniowy"
                />
              )}
            </form.AppField>
            <div className="flex flex-wrap gap-2">
              <Button
                className="flex-1 sm:flex-none"
                disabled={isCreating}
                type="submit"
              >
                {isCreating ? (
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={LoaderCircleIcon}
                    className="size-4 animate-spin"
                  />
                ) : (
                  <HugeiconsIcon
                    aria-hidden="true"
                    icon={Add01Icon}
                    className="size-4"
                  />
                )}
                Utwórz grupę
              </Button>
              <Button
                aria-label="Zamknij tworzenie grupy"
                disabled={isCreating}
                onClick={onClose}
                size="icon"
                type="button"
                variant="ghost"
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Cancel01Icon}
                  className="size-4"
                />
              </Button>
            </div>
            <FormFeedback failure={submissionFailure} />
            <p className="text-muted-foreground text-xs">
              Maksymalnie 80 znaków. Nazwa będzie widoczna na liście grup.
            </p>
          </Form>
        </form.AppForm>
      </FramePanel>
    </Frame>
  );
};

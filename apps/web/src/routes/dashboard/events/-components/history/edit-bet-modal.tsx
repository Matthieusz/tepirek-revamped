import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback, useCanCloseForm } from "@/components/forms/form";
import { FormFieldError } from "@/components/forms/form-field-helpers";
import {
  getFieldErrorMessage,
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/form-field-utils";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { editBetAtom } from "@/features/events/bets/bet-atoms";
import { NonEmptyUserIdsSchema } from "@/features/events/bets/form-schemas";
import { HeroBetMemberPicker } from "@/features/events/bets/hero-bet-member-picker";
import { verifiedUsersAtom } from "@/features/users/user-atoms";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";

interface EditBetModalProps {
  readonly betId: number;
  readonly currentMembers: readonly {
    readonly userId: string;
    readonly userName: string;
    readonly userImage: string | null;
  }[];
  readonly heroName: string;
  readonly memberCount: number;
  readonly refreshInput: {
    readonly eventId?: number;
    readonly heroId?: number;
    readonly limit?: number;
    readonly page?: number;
  };
  readonly trigger?: React.ReactNode;
}

const EditBetFormSchema = Schema.Struct({
  userIds: NonEmptyUserIdsSchema,
});
const EditBetFormValidator = Schema.toStandardSchemaV1(EditBetFormSchema);

const EditBetModalContent = ({
  betId,
  currentMembers,
  heroName,
  memberCount,
  refreshInput,
  trigger,
}: EditBetModalProps) => {
  const [open, setOpen] = useState(false);
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const editBet = useAtomSet(editBetAtom, { mode: "promise" });
  const currentMemberIds: readonly string[] = useMemo(
    () => currentMembers.map((member) => member.userId),
    [currentMembers]
  );
  const verifiedUsersResult = useAtomValue(verifiedUsersAtom);
  const verifiedUsers = AsyncResult.isSuccess(verifiedUsersResult)
    ? [...verifiedUsersResult.value]
    : [];
  const usersLoading = !AsyncResult.isSuccess(verifiedUsersResult);
  const form = useAppForm({
    defaultValues: { userIds: currentMemberIds },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded = await EditBetFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const result = await runFormSubmission(() =>
        editBet({
          betId,
          newUserIds: decoded.value.userIds,
          refreshInput,
        })
      );
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }

      toast.success("Obstawienie zostało zaktualizowane");
      form.reset();
      setOpen(false);
    },
    validators: { onSubmit: EditBetFormValidator },
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
  let submitLabel = "Zapisz zmiany";
  if (usersLoading) {
    submitLabel = "Ładowanie...";
  } else if (isSubmitting) {
    submitLabel = "Zapisywanie...";
  }

  return (
    <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
      <ResponsiveDialogTrigger asChild>
        {trigger ?? (
          <Button
            aria-label={`Edytuj obstawienie na herosa ${heroName}`}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent
        description={`Modyfikuj listę graczy obstawiających herosa "${heroName}".`}
        title="Edytuj obstawienie"
        className="sm:max-w-[600px]"
      >
        <form.AppForm>
          <Form form={form}>
            <form.Field name="userIds">
              {(field) => {
                const fieldId = getFieldId(field.name);
                const errorId = getFieldErrorId(fieldId);
                const error = getFieldErrorMessage(field.state.meta.errors);
                const showError =
                  error !== undefined &&
                  (field.state.meta.isTouched ||
                    field.form.state.submissionAttempts > 0);
                return (
                  <fieldset
                    aria-describedby={showError ? errorId : undefined}
                    aria-invalid={showError || undefined}
                    aria-labelledby={`${fieldId}-label`}
                    className="grid gap-2 py-4"
                    id={fieldId}
                  >
                    <legend className="sr-only" id={`${fieldId}-label`}>
                      Gracze
                    </legend>
                    <HeroBetMemberPicker
                      fieldName={field.name}
                      idPrefix={fieldId}
                      initialMemberIds={currentMemberIds}
                      onBlur={field.handleBlur}
                      onChange={(userIds) => {
                        field.handleChange(userIds);
                      }}
                      pointsPreview={{ currentMemberCount: memberCount }}
                      selectedUserIds={[...field.state.value]}
                      users={verifiedUsers}
                      usersLoading={usersLoading}
                      variant="edit"
                    />
                    <FormFieldError
                      error={showError ? error : undefined}
                      id={errorId}
                    />
                  </fieldset>
                );
              }}
            </form.Field>

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
              <Button disabled={isSubmitting || usersLoading} type="submit">
                {submitLabel}
              </Button>
            </ResponsiveDialogFooter>
          </Form>
        </form.AppForm>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export const EditBetModal = (props: EditBetModalProps) => (
  <EditBetModalContent
    key={`${props.betId}-${props.currentMembers.map((member) => member.userId).join(",")}`}
    {...props}
  />
);

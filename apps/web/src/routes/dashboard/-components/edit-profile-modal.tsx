import { useAtomSet } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import { UpdateProfilePayload } from "@tepirek-revamped/api/protocol/user/http-api-contract";
import * as Schema from "effect/Schema";
import { useEffect, useState } from "react";
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
import { updateProfileAtom } from "@/features/users/user-atoms";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";

interface EditProfileModalProps {
  readonly defaultName: string;
  readonly trigger: React.ReactNode;
}

const ProfileFormSchema = Schema.Struct({
  name: UpdateProfilePayload.fields.name,
});
const ProfileFormValidator = Schema.toStandardSchemaV1(ProfileFormSchema);

export const EditProfileModal = ({
  trigger,
  defaultName,
}: EditProfileModalProps) => {
  const [open, setOpen] = useState(false);
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const updateProfile = useAtomSet(updateProfileAtom, { mode: "promise" });
  const form = useAppForm({
    defaultValues: { name: defaultName },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded = await ProfileFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }

      const result = await runFormSubmission(() =>
        updateProfile(decoded.value)
      );
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }

      toast.success("Profil zaktualizowany");
      form.reset();
      setOpen(false);
    },
    validators: { onSubmit: ProfileFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
  const canDiscard = useCanCloseForm(isSubmitting);

  useEffect(() => {
    form.reset({ name: defaultName });
    setSubmissionFailure(undefined);
  }, [defaultName, form]);

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
      <ResponsiveDialogTrigger
        render={
          <ResponsiveDialogContent className="sm:max-w-[425px]">
            <form.AppForm>
              <Form form={form}>
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle>Edytuj profil</ResponsiveDialogTitle>
                  <ResponsiveDialogDescription>
                    Zmień wyświetlaną nazwę.
                  </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className="grid gap-4 py-4">
                  <form.AppField name="name">
                    {(field) => (
                      <field.TextField
                        label="Nazwa użytkownika"
                        placeholder="Wpisz nazwę"
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
                    {isSubmitting ? "Zapisywanie..." : "Zapisz"}
                  </Button>
                </ResponsiveDialogFooter>
              </Form>
            </form.AppForm>
          </ResponsiveDialogContent>
        }
      >
        {trigger}
      </ResponsiveDialogTrigger>
    </ResponsiveDialog>
  );
};

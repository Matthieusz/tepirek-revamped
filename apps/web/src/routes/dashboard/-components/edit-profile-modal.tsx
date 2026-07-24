import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { UpdateProfilePayload } from "@tepirek-revamped/api/protocol/user/http-api-contract";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  EffectForm,
  EffectFormFeedback,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
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
import { updateProfileAtom } from "@/features/users/user-atoms";
import { formSubmission } from "@/lib/form-submission";

interface EditProfileModalProps {
  readonly defaultName: string;
  readonly trigger: React.ReactNode;
}

const profileFormBuilder = FormBuilder.empty.addField(
  "name",
  UpdateProfilePayload.fields.name
);

type UpdateProfile = (payload: UpdateProfilePayload) => Promise<unknown>;

const profileForm = FormReact.make(profileFormBuilder, {
  fields: { name: EffectTextField },
  mode: { validation: "onSubmit" },
  onSubmit: (updateProfile: UpdateProfile, { decoded }) =>
    formSubmission(() => updateProfile(decoded)),
});

export const EditProfileModal = ({
  trigger,
  defaultName,
}: EditProfileModalProps) => {
  const [open, setOpen] = useState(false);
  const updateProfile = useAtomSet(updateProfileAtom, { mode: "promise" });
  const submit = useAtomSet(profileForm.submit);
  const reset = useAtomSet(profileForm.reset);
  const submitResult = useAtomValue(profileForm.submit);
  const isDirty = useAtomValue(profileForm.isDirty);
  const canDiscard = useEffectFormProtection(isDirty, submitResult.waiting);

  useEffect(() => {
    if (AsyncResult.isSuccess(submitResult)) {
      toast.success("Profil zaktualizowany");
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
      <ResponsiveDialogTrigger
        render={
          <ResponsiveDialogContent className="sm:max-w-[425px]">
            <profileForm.Initialize
              defaultValues={{ name: defaultName }}
              key={defaultName}
            >
              <EffectForm
                action={() => submit(() => updateProfile)}
                submitResult={submitResult}
              >
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle>Edytuj profil</ResponsiveDialogTitle>
                  <ResponsiveDialogDescription>
                    Zmień wyświetlaną nazwę.
                  </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className="grid gap-4 py-4">
                  <profileForm.name
                    label="Nazwa użytkownika"
                    placeholder="Wpisz nazwę"
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
                    {submitResult.waiting ? "Zapisywanie..." : "Zapisz"}
                  </Button>
                </ResponsiveDialogFooter>
              </EffectForm>
            </profileForm.Initialize>
          </ResponsiveDialogContent>
        }
      >
        {trigger}
      </ResponsiveDialogTrigger>
    </ResponsiveDialog>
  );
};

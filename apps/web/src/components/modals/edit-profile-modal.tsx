import { useAtomSet } from "@effect-atom/atom-react";
import { useForm } from "@tanstack/react-form";
import { UpdateProfilePayload } from "@tepirek-revamped/api/modules/user/http-api-contract";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  effectSchemaValidator,
  formErrorMessage,
} from "@/lib/effect-schema-validator";
import { getErrorMessage } from "@/lib/errors";
import { updateProfileAtom } from "@/lib/user-atoms";

interface EditProfileModalProps {
  trigger: React.ReactNode;
  defaultName: string;
}

export const EditProfileModal = ({
  trigger,
  defaultName,
}: EditProfileModalProps) => {
  const [open, setOpen] = useState(false);
  const updateProfile = useAtomSet(updateProfileAtom, { mode: "promise" });

  const form = useForm({
    defaultValues: {
      name: defaultName,
    },
    onSubmit: async ({ value }) => {
      try {
        await updateProfile({
          name: value.name,
        });
        toast.success("Profil zaktualizowany");
        setOpen(false);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    validators: {
      onSubmit: effectSchemaValidator(UpdateProfilePayload),
    },
  });

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      <ResponsiveDialogTrigger
        render={
          <ResponsiveDialogContent className="sm:max-w-[425px]">
            <form
              // oxlint-disable-next-line @typescript-eslint/no-misused-promises
              action={async () => {
                await form.handleSubmit();
              }}
            >
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>Edytuj profil</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  Zmień wyświetlaną nazwę.
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <form.Field name="name">
                    {(field) => (
                      <div className="grid gap-1.5">
                        <Label htmlFor={field.name}>Nazwa użytkownika</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => {
                            field.handleChange(e.target.value);
                          }}
                          placeholder="Wpisz nazwę"
                          value={field.state.value}
                        />
                        {field.state.meta.errors.map((e) => (
                          <p
                            className="text-red-500 text-sm"
                            key={`${field.name}-${formErrorMessage(e)}`}
                          >
                            {formErrorMessage(e)}
                          </p>
                        ))}
                      </div>
                    )}
                  </form.Field>
                </div>
              </div>
              <ResponsiveDialogFooter>
                <form.Subscribe>
                  {(state) => (
                    <Button
                      disabled={!state.canSubmit || state.isSubmitting}
                      type="submit"
                    >
                      {state.isSubmitting ? "Zapisywanie..." : "Zapisz"}
                    </Button>
                  )}
                </form.Subscribe>
              </ResponsiveDialogFooter>
            </form>
          </ResponsiveDialogContent>
        }
      >
        {trigger}
      </ResponsiveDialogTrigger>
    </ResponsiveDialog>
  );
};

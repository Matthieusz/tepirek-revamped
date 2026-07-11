import { useAtomSet } from "@effect/atom-react";
import { useForm } from "@tanstack/react-form";
import { CreateAnnouncementPayload } from "@tepirek-revamped/api/protocol/announcement/http-api-contract";
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
import { Textarea } from "@/components/ui/textarea";
import { createAnnouncementAtom } from "@/lib/announcement-atoms";
import {
  effectSchemaValidator,
  formErrorMessage,
} from "@/lib/effect-schema-validator";
import { getErrorMessage } from "@/lib/errors";

interface AddAnnouncementModalProps {
  trigger: React.ReactNode;
}

export const AddAnnouncementModal = ({
  trigger,
}: AddAnnouncementModalProps) => {
  const [open, setOpen] = useState(false);
  const createAnnouncement = useAtomSet(createAnnouncementAtom, {
    mode: "promise",
  });

  const form = useForm({
    defaultValues: {
      description: "",
      title: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await createAnnouncement({
          description: value.description,
          title: value.title,
        });

        toast.success("Ogłoszenie utworzone pomyślnie");
        setOpen(false);
        form.reset();
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    validators: {
      onSubmit: effectSchemaValidator(CreateAnnouncementPayload),
    },
  });

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-150">
        <form
          // oxlint-disable-next-line @typescript-eslint/no-misused-promises
          action={async () => {
            await form.handleSubmit();
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Dodaj nowe ogłoszenie</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Utwórz nowe ogłoszenie z tytułem i opisem.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <form.Field name="title">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Tytuł ogłoszenia</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                      }}
                      placeholder="Wpisz tytuł ogłoszenia"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-red-500 text-sm"
                        key={formErrorMessage(error)}
                      >
                        {formErrorMessage(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>
            <div className="grid gap-2">
              <form.Field name="description">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Opis ogłoszenia</Label>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                      }}
                      placeholder="Wpisz opis ogłoszenia"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-red-500 text-sm"
                        key={formErrorMessage(error)}
                      >
                        {formErrorMessage(error)}
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
                  {state.isSubmitting ? "Tworzenie..." : "Dodaj ogłoszenie"}
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

import { useAtomSet } from "@effect/atom-react";
import { useForm } from "@tanstack/react-form";
import { CreateRangePayload } from "@tepirek-revamped/api/protocol/skills/http-api-contract";
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
import { createSkillRangeAtom } from "@/lib/skill-atoms";

interface AddEventModalProps {
  trigger: React.ReactNode;
}

interface AddRangeModal {
  level: number;
  image?: string;
  name: string;
}

const defaultValues: AddRangeModal = {
  image: "",
  level: 1,
  name: "",
};

export const AddRangeModal = ({ trigger }: AddEventModalProps) => {
  const [open, setOpen] = useState(false);
  const createSkillRange = useAtomSet(createSkillRangeAtom, {
    mode: "promise",
  });

  const form = useForm({
    defaultValues: {
      ...defaultValues,
    },
    onSubmit: async ({ value }) => {
      try {
        await createSkillRange({
          image: value.image ?? "",
          level: value.level,
          name: value.name,
        });

        toast.success("Przedział utworzony pomyślnie");
        setOpen(false);
        form.reset();
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    validators: {
      onSubmit: effectSchemaValidator(CreateRangePayload),
    },
  });

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-106.25">
        <form
          // oxlint-disable-next-line @typescript-eslint/no-misused-promises
          action={async () => {
            await form.handleSubmit();
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Dodaj nowy przedział</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Utwórz nowy przedział z nazwą i poziomem.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <form.Field name="name">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Nazwa przedziału</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                      }}
                      placeholder="Wpisz nazwę przedziału"
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
              <form.Field name="level">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Level</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(
                          Number.parseInt(e.target.value, 10) || 0
                        );
                      }}
                      placeholder="Wpisz level"
                      type="number"
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
              <form.Field name="image">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>URL obrazka</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                      }}
                      placeholder="Wpisz URL obrazka"
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
                  {state.isSubmitting ? "Tworzenie..." : "Utwórz przedział"}
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

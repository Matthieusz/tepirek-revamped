import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
import { orpc } from "@/utils/orpc";

interface AddAnnouncementModalProps {
  trigger: React.ReactNode;
}

export const AddAnnouncementModal = ({
  trigger,
}: AddAnnouncementModalProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      description: "",
      title: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await orpc.announcement.create.call({
          description: value.description,
          title: value.title,
        });

        toast.success("Ogłoszenie utworzone pomyślnie");
        await queryClient.invalidateQueries({
          queryKey: orpc.announcement.getAll.queryKey(),
        });
        setOpen(false);
        form.reset();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nie udało się utworzyć ogłoszenia";
        toast.error(message);
      }
    },
    validators: {
      onSubmit: z.object({
        description: z.string().min(1, "Opis ogłoszenia jest wymagany"),
        title: z.string().min(1, "Tytuł ogłoszenia jest wymagany"),
      }),
    },
  });

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-[600px]">
        <form
          // oxlint-disable-next-line @typescript-eslint/no-misused-promises
          onSubmit={async (e) => {
            e.preventDefault();
            e.stopPropagation();
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
                      <p className="text-red-500 text-sm" key={error?.message}>
                        {error?.message}
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
                      <p className="text-red-500 text-sm" key={error?.message}>
                        {error?.message}
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

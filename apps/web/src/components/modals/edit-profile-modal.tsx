import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc } from "@/utils/orpc";

interface EditProfileModalProps {
  trigger: React.ReactNode;
  defaultName: string;
}

const schema = z.object({
  name: z
    .string()
    .min(2, "Imię jest wymagane")
    .max(24, "Maksymalna długość to 24 znaki"),
});

export function EditProfileModal({
  trigger,
  defaultName,
}: EditProfileModalProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: defaultName,
    },
    onSubmit: async ({ value }) => {
      try {
        await orpc.user.updateProfile.call({
          name: value.name,
        });
        toast.success("Profil zaktualizowany");
        queryClient.invalidateQueries({
          queryKey: orpc.user.getSession.queryKey(),
        });
        setOpen(false);
      } catch (_) {
        toast.error("Nie udało się zaktualizować profilu");
      }
    },
    validators: {
      onSubmit: schema,
    },
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edytuj profil</DialogTitle>
            <DialogDescription>Zmień wyświetlaną nazwę.</DialogDescription>
          </DialogHeader>
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
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Wpisz nazwę"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.map((e) => (
                      <p
                        className="text-red-500 text-sm"
                        key={`${field.name}-${e?.message}`}
                      >
                        {e?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>
          </div>
          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

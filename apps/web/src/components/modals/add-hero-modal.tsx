import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/utils/orpc";

interface AddHeroModalProps {
  trigger: React.ReactNode;
}

interface AddHeroModal {
  name: string;
  image?: string;
  level: string;
  eventId: string;
}

const defaultValues: AddHeroModal = {
  eventId: "",
  image: "",
  level: "1",
  name: "",
};

export const AddHeroModal = ({ trigger }: AddHeroModalProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: events, isPending: eventsLoading } = useQuery(
    orpc.event.getAll.queryOptions()
  );

  const form = useForm({
    defaultValues: {
      ...defaultValues,
    },
    onSubmit: async ({ value }) => {
      try {
        if (value.eventId === "") {
          toast.error("Wybierz event!");
          return;
        }

        await orpc.heroes.create.call({
          eventId: Number.parseInt(value.eventId, 10),
          image: value.image ?? undefined,
          level: Number.parseInt(value.level, 10),
          name: value.name,
        });

        toast.success("Heros utworzony pomyślnie");
        // oxlint-disable-next-line @typescript-eslint/no-floating-promises
        queryClient.invalidateQueries({
          queryKey: orpc.heroes.getAll.queryKey(),
        });
        setOpen(false);
        form.reset();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nie udało się utworzyć herosa";
        toast.error(message);
      }
    },
    validators: {
      onSubmit: z.object({
        eventId: z.string().min(1, "Wybierz event"),
        image: z.string().optional(),
        level: z.string().min(1, "Poziom jest wymagany"),
        name: z.string().min(1, "Nazwa herosa jest wymagana"),
      }),
    },
  });

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-[425px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // oxlint-disable-next-line @typescript-eslint/no-floating-promises
            form.handleSubmit();
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Dodaj nowego herosa</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Utwórz nowego herosa do wybranego eventu.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <form.Field name="name">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Nazwa herosa</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                      }}
                      placeholder="Wprowadź nazwę herosa"
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
              <form.Field name="image">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>
                      URL obrazka (opcjonalnie)
                    </Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                      }}
                      placeholder="Wprowadź URL obrazka"
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
              <form.Field name="level">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Poziom</Label>
                    <Input
                      id={field.name}
                      max={300}
                      min={1}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        field.handleChange(e.target.value);
                      }}
                      placeholder="Wprowadź poziom"
                      type="number"
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
              <form.Field name="eventId">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Event</Label>
                    <Select
                      onValueChange={field.handleChange}
                      value={field.state.value}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Wybierz event" />
                      </SelectTrigger>
                      <SelectContent>
                        {eventsLoading ? (
                          <SelectItem disabled value="loading">
                            Ładowanie...
                          </SelectItem>
                        ) : (
                          events?.map((event) => (
                            <SelectItem
                              key={event.id}
                              value={event.id.toString()}
                            >
                              {event.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
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
                  disabled={
                    !state.canSubmit || state.isSubmitting || eventsLoading
                  }
                  type="submit"
                >
                  {state.isSubmitting ? "Tworzenie..." : "Utwórz herosa"}
                </Button>
              )}
            </form.Subscribe>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

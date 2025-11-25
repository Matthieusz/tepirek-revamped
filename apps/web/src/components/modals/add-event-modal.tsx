import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

interface AddEventModalProps {
  trigger: React.ReactNode;
}

export function AddEventModal({ trigger }: AddEventModalProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: "",
      endTime: "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (!date) {
          toast.error("Wybierz datę końcową eventu!");
          return;
        }

        await orpc.event.create.call({
          name: value.name,
          endTime: date.toISOString(),
        });

        toast.success("Event utworzony pomyślnie");
        queryClient.invalidateQueries({
          queryKey: orpc.event.getAll.queryKey(),
        });
        setOpen(false);
        form.reset();
        setDate(undefined);
      } catch (_) {
        toast.error("Nie udało się utworzyć eventu");
      }
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(1, "Nazwa eventu jest wymagana"),
        endTime: z.string(),
      }),
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
            <DialogTitle>Dodaj nowy event</DialogTitle>
            <DialogDescription>
              Utwórz nowy event z nazwą i datą końcową.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <form.Field name="name">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Nazwa eventu</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Wpisz nazwę eventu"
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
              <form.Field name="endTime">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor="date">Data końcowa</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          className={cn(
                            "justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                          id="date"
                          variant="outline"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : "Wybierz datę"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          onSelect={(selectedDate) => {
                            setDate(selectedDate);
                            field.handleChange(
                              selectedDate?.toISOString() || ""
                            );
                          }}
                          selected={date}
                        />
                      </PopoverContent>
                    </Popover>
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
          <DialogFooter>
            <form.Subscribe>
              {(state) => (
                <Button
                  disabled={!state.canSubmit || state.isSubmitting}
                  type="submit"
                >
                  {state.isSubmitting ? "Tworzenie..." : "Utwórz event"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

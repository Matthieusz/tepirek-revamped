import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Cake,
  Calendar as CalendarIcon,
  Egg,
  Ghost,
  Snowflake,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

interface AddEventModalProps {
  trigger: React.ReactNode;
}

const EVENT_ICONS = [
  { icon: Egg, id: "egg", name: "Wielkanoc" },
  { icon: Sun, id: "sun", name: "Wakacje" },
  { icon: Ghost, id: "ghost", name: "Halloween" },
  { icon: Cake, id: "cake", name: "Urodziny" },
  { icon: Snowflake, id: "snowflake", name: "Gwiazdka" },
  { icon: CalendarIcon, id: "calendar", name: "Inne" },
] as const;

const EVENT_COLORS = [
  { id: "#22c55e", name: "Zielony" },
  { id: "#eab308", name: "Żółty" },
  { id: "#f97316", name: "Pomarańczowy" },
  { id: "#ef4444", name: "Czerwony" },
  { id: "#8b5cf6", name: "Fioletowy" },
  { id: "#6366f1", name: "Indygo" },
  { id: "#3b82f6", name: "Niebieski" },
  { id: "#06b6d4", name: "Cyjan" },
  { id: "#ec4899", name: "Różowy" },
] as const;

export const AddEventModal = ({ trigger }: AddEventModalProps) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [selectedIcon, setSelectedIcon] = useState("calendar");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      endTime: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (!date) {
          toast.error("Wybierz datę końcową eventu!");
          return;
        }

        await orpc.event.create.call({
          color: selectedColor,
          endTime: date.toISOString(),
          icon: selectedIcon,
          name: value.name,
        });

        toast.success("Event utworzony pomyślnie");
        queryClient.invalidateQueries({
          queryKey: orpc.event.getAll.queryKey(),
        });
        setOpen(false);
        form.reset();
        setDate(undefined);
        setSelectedIcon("calendar");
        setSelectedColor("#6366f1");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nie udało się utworzyć eventu";
        toast.error(message);
      }
    },
    validators: {
      onSubmit: z.object({
        endTime: z.string(),
        name: z.string().min(1, "Nazwa eventu jest wymagana"),
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
            form.handleSubmit();
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Dodaj nowy event</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Utwórz nowy event z nazwą i datą końcową.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
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

            {/* Icon Selection */}
            <div className="grid gap-2">
              <Label>Ikona eventu</Label>
              <div className="grid grid-cols-3 gap-2">
                {EVENT_ICONS.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-3 transition-all hover:bg-muted/50",
                        selectedIcon === item.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "border-border"
                      )}
                      key={item.id}
                      onClick={() => setSelectedIcon(item.id)}
                      type="button"
                    >
                      <IconComponent
                        className="h-5 w-5"
                        style={{ color: selectedColor }}
                      />
                      <span className="text-xs">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selection */}
            <div className="grid gap-2">
              <Label>Kolor przewodni</Label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map((color) => (
                  <button
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-all",
                      selectedColor === color.id
                        ? "scale-110 border-foreground"
                        : "border-transparent"
                    )}
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    style={{ backgroundColor: color.id }}
                    title={color.name}
                    type="button"
                  />
                ))}
              </div>
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
          <ResponsiveDialogFooter>
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
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

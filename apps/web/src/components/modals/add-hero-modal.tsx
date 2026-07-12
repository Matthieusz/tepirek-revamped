import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { useForm } from "@tanstack/react-form";
import * as Schema from "effect/Schema";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resultIsLoading, resultValueOr } from "@/lib/effect-atom-result";
import {
  effectSchemaValidator,
  formErrorMessage,
} from "@/lib/effect-schema-validator";
import { getErrorMessage } from "@/lib/errors";
import { eventsAtom } from "@/lib/event-atoms";
import { createHeroAtom } from "@/lib/hero-atoms";

interface AddHeroModalProps {
  trigger: React.ReactNode;
}

interface AddHeroModal {
  name: string;
  image?: string;
  level: string;
  eventId: string;
}

const AddHeroFormSchema = Schema.Struct({
  eventId: Schema.NonEmptyString,
  image: Schema.optional(Schema.String),
  level: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
});

const defaultValues: AddHeroModal = {
  eventId: "",
  image: "",
  level: "1",
  name: "",
};

export const AddHeroModal = ({ trigger }: AddHeroModalProps) => {
  const [open, setOpen] = useState(false);
  const createHero = useAtomSet(createHeroAtom, { mode: "promise" });
  const eventsResult = useAtomValue(eventsAtom);
  const events = resultValueOr(eventsResult, []);
  const eventsLoading = resultIsLoading(eventsResult);

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

        await createHero({
          eventId: Number.parseInt(value.eventId, 10),
          ...(value.image ? { image: value.image } : {}),
          level: Number.parseInt(value.level, 10),
          name: value.name,
        });

        toast.success("Heros utworzony pomyślnie");
        setOpen(false);
        form.reset();
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    validators: {
      onSubmit: effectSchemaValidator(AddHeroFormSchema),
    },
  });

  return (
    <ResponsiveDialog onOpenChange={setOpen} open={open}>
      <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-106.25">
        <form
          action={() => {
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
              <form.Field name="eventId">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Event</Label>
                    <Select
                      onValueChange={(value) => {
                        if (value !== null) {
                          field.handleChange(value);
                        }
                      }}
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

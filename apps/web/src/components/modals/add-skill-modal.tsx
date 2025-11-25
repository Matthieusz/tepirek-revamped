import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orpc } from "@/utils/orpc";

interface AddSkillModalProps {
  trigger: React.ReactNode;
  defaultRangeId: number;
  defaultProfessionId?: number;
}

const defaultValues = {
  name: "",
  mastery: false,
  professionId: "",
  link: "",
};

export function AddSkillModal({
  trigger,
  defaultRangeId,
  defaultProfessionId,
}: AddSkillModalProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const professions = useQuery(orpc.skills.getAllProfessions.queryOptions());

  const form = useForm({
    defaultValues: {
      ...defaultValues,
      professionId: defaultProfessionId ? String(defaultProfessionId) : "",
    },
    onSubmit: async ({ value }) => {
      try {
        if (!value.professionId) {
          toast.error("Wybierz profesję!");
          return;
        }
        await orpc.skills.createSkill.call({
          name: value.name,
          link: value.link,
          mastery: value.mastery,
          professionId: Number.parseInt(value.professionId, 10),
          rangeId: defaultRangeId,
        });
        toast.success("Zestaw utworzony");
        queryClient.invalidateQueries();
        setOpen(false);
        form.reset();
      } catch (_) {
        toast.error("Nie udało się utworzyć zestawu");
      }
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(1, "Nazwa jest wymagana"),
        link: z.url("Podaj poprawny URL").min(1, "Link jest wymagany"),
        mastery: z.boolean(),
        professionId: z.string().min(1, "Wybierz profesję"),
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
            <DialogTitle>Dodaj zestaw umiejętności</DialogTitle>
            <DialogDescription>
              Utwórz nowy zestaw umiejętności w tym przedziale.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <form.Field name="link">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Link</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="https://margoworld.pl/tools/skills#AyKaZmAA/iA="
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
              <form.Field name="name">
                {(field) => (
                  <div className="grid gap-1.5">
                    <Label htmlFor={field.name}>Nazwa</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Wpisz nazwę zestawu umiejętności"
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
            <div className="grid grid-cols-2">
              <div className="grid gap-2">
                <form.Field name="professionId">
                  {(field) => (
                    <div className="grid gap-1.5">
                      <Label htmlFor={field.name}>Profesja</Label>
                      <Select
                        onValueChange={field.handleChange}
                        value={field.state.value}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue placeholder="Wybierz profesję" />
                        </SelectTrigger>
                        <SelectContent>
                          {professions.data?.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.state.meta.errors.map((error) => (
                        <p
                          className="text-red-500 text-sm"
                          key={error?.message}
                        >
                          {error?.message}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>
              <div className="flex items-center gap-2">
                <form.Field name="mastery">
                  {(field) => (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={field.state.value}
                        id={field.name}
                        onCheckedChange={(val) =>
                          field.handleChange(Boolean(val))
                        }
                      />
                      <Label htmlFor={field.name}>Mistrzostwo?</Label>
                    </div>
                  )}
                </form.Field>
              </div>
            </div>
          </div>
          <DialogFooter>
            <form.Subscribe>
              {(state) => (
                <Button
                  disabled={!state.canSubmit || state.isSubmitting}
                  type="submit"
                >
                  {state.isSubmitting ? "Tworzenie..." : "Utwórz zestaw"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

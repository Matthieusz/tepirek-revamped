import { useAtomSet } from "@effect/atom-react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  EffectForm,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { createSquadGroupAtom } from "@/lib/squad-builder/squad-group-atoms";

interface CreateSquadGroupFrameProps {
  readonly onClose: () => void;
}

export const CreateSquadGroupFrame = ({
  onClose,
}: CreateSquadGroupFrameProps) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createSquadGroup = useAtomSet(createSquadGroupAtom, {
    mode: "promise",
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffectFormProtection(name.trim().length > 0, isCreating);

  const submit = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      toast.error("Podaj nazwę grupy");
      inputRef.current?.focus();
      return;
    }

    setIsCreating(true);
    try {
      const group = await createSquadGroup({ name: trimmedName });
      toast.success("Grupa składów została utworzona");
      await navigate({
        params: { groupId: String(group.groupId) },
        to: "/dashboard/squad-builder/squads/$groupId",
      });
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Nie udało się utworzyć grupy składów")
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
      <FramePanel className="p-0 shadow-none">
        <EffectForm action={submit} className="space-y-2 p-4">
          <Label htmlFor="new-squad-group-name">
            Nazwa nowej grupy składów
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              ref={inputRef}
              autoComplete="off"
              className="min-w-0 flex-1"
              disabled={isCreating}
              id="new-squad-group-name"
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Escape" &&
                  name.trim().length === 0 &&
                  !isCreating
                ) {
                  onClose();
                }
              }}
              placeholder="Np. Kolos tygodniowy"
              value={name}
            />
            <div className="flex w-full shrink-0 gap-2 sm:w-auto">
              <Button
                className="flex-1 sm:flex-none"
                disabled={isCreating}
                type="submit"
              >
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Utwórz grupę
              </Button>
              <Button
                aria-label="Zamknij tworzenie grupy"
                disabled={isCreating}
                onClick={onClose}
                size="icon"
                type="button"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Maksymalnie 80 znaków. Nazwa będzie widoczna na liście grup.
          </p>
        </EffectForm>
      </FramePanel>
    </Frame>
  );
};

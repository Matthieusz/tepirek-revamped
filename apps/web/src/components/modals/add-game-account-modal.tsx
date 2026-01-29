import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CharacterPreviewRow } from "@/components/squad-builder/character-preview-row";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import {
  type ParsedAccount,
  parseMargonemProfile,
} from "@/lib/margonem-parser";
import { orpc } from "@/utils/orpc";

type AddGameAccountModalProps = {
  trigger: React.ReactNode;
};

export function AddGameAccountModal({ trigger }: AddGameAccountModalProps) {
  const [open, setOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedAccount | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      html: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      if (!parsedData) {
        toast.error("Najpierw sparsuj dane z HTML");
        return;
      }

      try {
        await orpc.squad.createGameAccount.call({
          name: value.name || parsedData.name,
          profileUrl: parsedData.profileUrl,
          accountLevel: parsedData.accountLevel,
          characters: parsedData.characters,
        });

        toast.success("Konto gry dodane pomyślnie");
        queryClient.invalidateQueries({
          queryKey: orpc.squad.getMyGameAccounts.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.squad.getMyCharacters.queryKey(),
        });
        setOpen(false);
        form.reset();
        setParsedData(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Nie udało się dodać konta gry";
        toast.error(message);
      }
    },
  });

  const handleParseHtml = () => {
    const html = form.getFieldValue("html");
    if (!html || html.trim().length === 0) {
      setParseError("Wklej kod HTML profilu");
      return;
    }

    try {
      const result = parseMargonemProfile(html);
      if (result.characters.length === 0) {
        setParseError(
          "Nie znaleziono żadnych postaci w podanym HTML. Upewnij się, że wklejasz cały kod HTML profilu."
        );
        return;
      }

      setParsedData(result);
      setParseError(null);
      form.setFieldValue("name", result.name);
      toast.success(`Znaleziono ${result.characters.length} postaci`);
    } catch {
      setParseError(
        "Błąd parsowania HTML. Sprawdź czy wklejony kod jest poprawny."
      );
      setParsedData(null);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setParsedData(null);
      setParseError(null);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Dodaj konto z gry</DialogTitle>
            <DialogDescription>
              Wklej kod HTML strony profilu z margonem.pl, aby zaimportować
              postacie. Otwórz swój profil na margonem.pl, kliknij prawym
              przyciskiem myszy, wybierz "Zbadaj" lub "Wyświetl źródło strony" i
              skopiuj cały HTML.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <form.Field name="html">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor="html">Kod HTML profilu</Label>
                  <Textarea
                    className="min-h-[150px] font-mono text-xs"
                    id="html"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Wklej tutaj kod HTML ze strony profilu margonem.pl..."
                    value={field.state.value}
                  />
                  {parseError && (
                    <p className="text-destructive text-sm">{parseError}</p>
                  )}
                </div>
              )}
            </form.Field>

            <Button
              className="w-full"
              onClick={handleParseHtml}
              type="button"
              variant="secondary"
            >
              Parsuj HTML
            </Button>

            {parsedData && (
              <>
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{parsedData.name}</h4>
                      {parsedData.accountLevel && (
                        <p className="text-muted-foreground text-sm">
                          Poziom konta: {parsedData.accountLevel}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {parsedData.characters.length} postaci
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label>Znalezione postacie:</Label>
                    <div className="grid max-h-[200px] gap-2 overflow-y-auto">
                      {parsedData.characters.map((char) => (
                        <CharacterPreviewRow
                          character={char}
                          key={char.externalId}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <form.Field name="name">
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor="name">
                        Nazwa konta (opcjonalnie zmień)
                      </Label>
                      <Input
                        id="name"
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Nazwa konta"
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Anuluj
            </Button>
            <Button disabled={!parsedData} type="submit">
              Dodaj konto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

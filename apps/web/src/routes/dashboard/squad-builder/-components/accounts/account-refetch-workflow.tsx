import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PreviewAccountRefetchSuccess } from "@tepirek-revamped/api/protocol/squad-builder/account-refetch/account-refetch-schema";
import { Check, Loader2, RotateCw, AlertTriangle } from "lucide-react";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  applyAccountRefetchMutationOptions,
  previewAccountRefetchMutationOptions,
} from "@/features/squad-builder/account-queries";
import { formatProfession } from "@/features/squad-builder/shared/profession-presenters";
import { getErrorMessage } from "@/lib/errors";
import {
  changeFieldLabel,
  formatChangeValue,
} from "@/routes/dashboard/squad-builder/-components/accounts/account-presenters";

interface AccountRefetchPreview {
  readonly refetchPreviewId: number;
  readonly diff: {
    readonly added: readonly {
      readonly characterId: number;
      readonly name: string;
      readonly level: number;
      readonly profession: string;
      readonly avatarUrl: string | null;
    }[];
    readonly removed: readonly {
      readonly databaseCharacterId: number;
      readonly characterId: number;
      readonly name: string;
      readonly level: number;
      readonly profession: string;
      readonly avatarUrl: string | null;
      readonly affectedSquadCount: number;
    }[];
    readonly changed: readonly {
      readonly databaseCharacterId: number;
      readonly characterId: number;
      readonly name: string;
      readonly changes: readonly {
        readonly field: "name" | "level" | "profession" | "avatarUrl";
        readonly before: string | number | null;
        readonly after: string | number | null;
      }[];
    }[];
    readonly unchangedCount: number;
  };
}

type AccountRefetchPreviewApi = PreviewAccountRefetchSuccess;

const toAccountRefetchPreview = (
  preview: AccountRefetchPreviewApi
): AccountRefetchPreview => ({
  diff: {
    added: preview.diff.added.map(({ latest }) => ({
      avatarUrl: latest.avatarUrl,
      characterId: latest.characterId,
      level: latest.level,
      name: latest.name,
      profession: latest.profession,
    })),
    changed: preview.diff.changed.map((character) => ({
      changes: character.changes,
      characterId: character.margonemCharacterId,
      databaseCharacterId: character.databaseCharacterId,
      name: character.latest.name,
    })),
    removed: preview.diff.removed.map(({ current }) => ({
      affectedSquadCount: current.affectedSquadCount,
      avatarUrl: current.avatarUrl,
      characterId: current.margonemCharacterId,
      databaseCharacterId: current.databaseCharacterId,
      level: current.level,
      name: current.name,
      profession: current.profession,
    })),
    unchangedCount: preview.diff.unchangedCount,
  },
  refetchPreviewId: preview.refetchPreviewId,
});

interface AccountRefetchWorkflowProps {
  readonly accountId: number;
  readonly children: ReactNode;
}

/** Manages previewing and applying the latest characters for one account. */
export const AccountRefetchWorkflow = ({
  accountId,
  children,
}: AccountRefetchWorkflowProps) => {
  const queryClient = useQueryClient();
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<AccountRefetchPreview | null>(null);
  const previewRefetch = useMutation(previewAccountRefetchMutationOptions());

  const applyRefetch = useMutation(
    applyAccountRefetchMutationOptions(queryClient)
  );

  const hasDiff =
    preview !== null &&
    (preview.diff.added.length > 0 ||
      preview.diff.removed.length > 0 ||
      preview.diff.changed.length > 0);

  const handlePreview = () => {
    previewRefetch.mutate(
      { accountId },
      {
        onError: (error) => {
          toast.error(
            getErrorMessage(error, "Nie udało się przygotować odświeżenia")
          );
        },
        onSuccess: (response) => {
          setPreview(toAccountRefetchPreview(response));
        },
      }
    );
  };

  const handleApply = () => {
    if (preview === null) {
      return;
    }

    applyRefetch.mutate(
      { refetchPreviewId: preview.refetchPreviewId },
      {
        onError: (error) => {
          toast.error(
            getErrorMessage(error, "Nie udało się zastosować odświeżenia")
          );
        },
        onSuccess: (response) => {
          toast.success(
            response.removedSquadCharacterCount > 0
              ? `Postacie odświeżone. Usunięto ${response.removedSquadCharacterCount} wpisów ze składów.`
              : "Postacie zostały odświeżone."
          );
          setPreview(null);
        },
      }
    );
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button
          ref={refreshButtonRef}
          aria-label="Odśwież postacie konta"
          title="Odśwież"
          disabled={previewRefetch.isPending || applyRefetch.isPending}
          onClick={handlePreview}
          size="sm"
          variant="outline"
        >
          {previewRefetch.isPending ? (
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          ) : (
            <RotateCw aria-hidden="true" className="size-3.5" />
          )}
          <span className="hidden lg:inline">Odśwież</span>
        </Button>
        {children}
      </div>

      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open && !applyRefetch.isPending) {
            setPreview(null);
          }
        }}
      >
        <DialogContent
          finalFocus={refreshButtonRef}
          className="flex max-h-[85dvh] flex-col overflow-hidden text-left whitespace-normal sm:max-w-xl"
        >
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>Podgląd odświeżenia</DialogTitle>
            <DialogDescription>
              Sprawdź zmiany w postaciach przed ich zastosowaniem.
            </DialogDescription>
          </DialogHeader>
          {preview !== null && (
            <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain">
              <div className="space-y-1">
                <div className="flex flex-wrap gap-1.5" aria-live="polite">
                  <Badge variant="secondary">
                    Dodane: {preview.diff.added.length}
                  </Badge>
                  <Badge variant="destructive">
                    Usunięte: {preview.diff.removed.length}
                  </Badge>
                  <Badge variant="outline">
                    Zmienione: {preview.diff.changed.length}
                  </Badge>
                  <Badge variant="secondary">
                    Bez zmian: {preview.diff.unchangedCount}
                  </Badge>
                </div>
                {preview.diff.removed.length > 0 && (
                  <Alert variant="default">
                    <AlertTriangle aria-hidden="true" />
                    <AlertTitle>Zmiana wpłynie na zapisane składy</AlertTitle>
                    <AlertDescription>
                      Usunięte postacie zostaną również usunięte z zapisanych
                      składów.
                    </AlertDescription>
                  </Alert>
                )}
                {!hasDiff && (
                  <p className="text-muted-foreground text-xs">
                    Nie znaleziono zmian w postaciach z Jaruny.
                  </p>
                )}
              </div>

              {preview.diff.added.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-medium">Dodane postacie</h4>
                  <ul className="space-y-1 text-xs">
                    {preview.diff.added.map((character) => (
                      <li key={character.characterId}>
                        {character.name} {character.level}{" "}
                        {formatProfession(character.profession)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.diff.removed.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-medium">
                    Usunięte z Jaruny / profilu
                  </h4>
                  <ul className="space-y-1 text-xs">
                    {preview.diff.removed.map((character) => (
                      <li key={character.databaseCharacterId}>
                        {character.name} {character.level}{" "}
                        {formatProfession(character.profession)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.diff.changed.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-medium">Zmienione postacie</h4>
                  <ul className="space-y-2 text-xs">
                    {preview.diff.changed.map((character) => (
                      <li key={character.databaseCharacterId}>
                        <span className="font-medium">{character.name}</span>
                        <ul className="text-muted-foreground ml-4 list-disc">
                          {character.changes.map((change) => (
                            <li
                              key={`${character.databaseCharacterId}-${change.field}`}
                            >
                              {changeFieldLabel(change.field)}: z „
                              {formatChangeValue(change.before)}” na „
                              {formatChangeValue(change.after)}”
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={applyRefetch.isPending}
                  onClick={handleApply}
                  size="sm"
                >
                  {applyRefetch.isPending ? (
                    <Loader2
                      aria-hidden="true"
                      className="size-3.5 animate-spin"
                    />
                  ) : (
                    <Check aria-hidden="true" className="size-3.5" />
                  )}
                  Zastosuj zmiany
                </Button>
                <Button
                  disabled={applyRefetch.isPending}
                  onClick={() => {
                    setPreview(null);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Nie teraz
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

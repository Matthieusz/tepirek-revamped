import { useAtomSet } from "@effect/atom-react";
import type { PreviewAccountRefetchSuccess } from "@tepirek-revamped/api/protocol/squad-builder/account-refetch/account-refetch-schema";
import { AlertTriangle, Check, Loader2, RotateCw } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge as ReuiBadge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import {
  applyAccountRefetchAtom,
  previewAccountRefetchAtom,
} from "@/features/squad-builder/account-refetch-atoms";
import { getErrorMessage } from "@/lib/errors";
import {
  changeFieldLabel,
  formatChangeValue,
} from "@/routes/dashboard/squad-builder/-components/accounts/account-presenters";
import { formatProfession } from "@/routes/dashboard/squad-builder/-components/profession-presenters";

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
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [preview, setPreview] = useState<AccountRefetchPreview | null>(null);
  const previewRefetch = useAtomSet(previewAccountRefetchAtom, {
    mode: "promise",
  });
  const applyRefetch = useAtomSet(applyAccountRefetchAtom, {
    mode: "promise",
  });

  const hasDiff =
    preview !== null &&
    (preview.diff.added.length > 0 ||
      preview.diff.removed.length > 0 ||
      preview.diff.changed.length > 0);

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const response = await previewRefetch({ accountId });
      setPreview(toAccountRefetchPreview(response));
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Nie udało się przygotować odświeżenia")
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (preview === null) {
      return;
    }

    setIsApplying(true);
    try {
      const response = await applyRefetch({
        refetchPreviewId: preview.refetchPreviewId,
      });
      toast.success(
        response.removedSquadCharacterCount > 0
          ? `Postacie odświeżone. Usunięto ${response.removedSquadCharacterCount} wpisów ze składów.`
          : "Postacie zostały odświeżone."
      );
      setPreview(null);
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Nie udało się zastosować odświeżenia")
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          disabled={isPreviewing}
          onClick={handlePreview}
          size="sm"
          variant="outline"
        >
          {isPreviewing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCw className="size-3.5" />
          )}
          Odśwież
        </Button>
        {children}
      </div>

      {preview !== null && (
        <div className="bg-muted/50 mt-3 space-y-3 rounded-lg p-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Podgląd odświeżenia</h3>
            <div className="flex flex-wrap gap-1.5" aria-live="polite">
              <ReuiBadge variant="success-light">
                Dodane: {preview.diff.added.length}
              </ReuiBadge>
              <ReuiBadge variant="destructive-light">
                Usunięte: {preview.diff.removed.length}
              </ReuiBadge>
              <ReuiBadge variant="warning-light">
                Zmienione: {preview.diff.changed.length}
              </ReuiBadge>
              <ReuiBadge variant="secondary">
                Bez zmian: {preview.diff.unchangedCount}
              </ReuiBadge>
            </div>
            {preview.diff.removed.length > 0 && (
              <Alert variant="warning">
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
            <Button disabled={isApplying} onClick={handleApply} size="sm">
              {isApplying ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Zastosuj zmiany
            </Button>
            <Button
              disabled={isApplying}
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
    </>
  );
};

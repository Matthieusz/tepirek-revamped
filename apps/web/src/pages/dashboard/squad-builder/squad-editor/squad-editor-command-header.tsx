import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { SquadGroupDraft } from "./squad-group-draft";

interface SquadEditorCommandHeaderProps {
  readonly draft: SquadGroupDraft;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly isViewer: boolean;
  readonly saveError: string | null;
  readonly visibility: "private" | "global";
  readonly role: "owner" | "editor" | "viewer";
  readonly onNameChange: (name: string) => void;
  readonly onSave: () => void;
}

const roleLabels = {
  editor: "edytor",
  owner: "właściciel",
  viewer: "tylko odczyt",
} as const;

const getSaveStatus = (
  isViewer: boolean,
  isSaving: boolean,
  isDirty: boolean
): string => {
  if (isViewer) {
    return "Możesz przeglądać zapisane składy.";
  }
  if (isSaving) {
    return "Zapisywanie";
  }
  if (isDirty) {
    return "Niezapisane zmiany";
  }
  return "Zapisano";
};

export const SquadEditorCommandHeader = ({
  draft,
  isDirty,
  isSaving,
  isViewer,
  onNameChange,
  onSave,
  role,
  saveError,
  visibility,
}: SquadEditorCommandHeaderProps) => (
  <header className="space-y-3">
    <div className="flex flex-wrap items-start gap-3">
      <Link
        aria-label="Wróć do grup składów"
        className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        to="/dashboard/squad-builder/squads"
      >
        <ArrowLeft className="size-4" />
        Grupy
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        {isViewer ? (
          <h1 className="break-words font-serif font-bold text-2xl tracking-tight">
            {draft.name}
          </h1>
        ) : (
          <>
            <Label htmlFor="group-name">Nazwa grupy</Label>
            <h1>
              <Input
                aria-label="Nazwa grupy"
                className="h-10 max-w-xl border-transparent bg-transparent px-0 font-serif font-bold text-2xl shadow-none focus-visible:border-input focus-visible:px-3"
                disabled={isSaving}
                id="group-name"
                maxLength={80}
                onChange={(event) => onNameChange(event.target.value)}
                value={draft.name}
              />
            </h1>
          </>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={role === "viewer" ? "secondary" : "primary-light"}>
            {roleLabels[role]}
          </Badge>
          <Badge variant={visibility === "global" ? "info-light" : "outline"}>
            {visibility === "global" ? "publiczna" : "prywatna"}
          </Badge>
          <span aria-live="polite" className="text-muted-foreground text-xs">
            {getSaveStatus(isViewer, isSaving, isDirty)}
          </span>
        </div>
      </div>
      {!isViewer && (
        <Button
          className="w-full sm:w-auto"
          disabled={isSaving || !isDirty || draft.name.trim().length === 0}
          onClick={onSave}
          type="button"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Zapisz
        </Button>
      )}
    </div>
    {saveError !== null && (
      <Alert variant="destructive">
        <AlertTitle>Nie udało się zapisać zmian</AlertTitle>
        <AlertDescription>{saveError}</AlertDescription>
      </Alert>
    )}
  </header>
);

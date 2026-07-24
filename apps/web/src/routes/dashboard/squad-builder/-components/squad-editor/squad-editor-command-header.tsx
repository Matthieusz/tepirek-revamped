import { Loader2, Save, Settings } from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SquadGroupDraft } from "@/routes/dashboard/squad-builder/-state/squad-group-draft";

interface SquadEditorCommandHeaderProps {
  readonly draft: SquadGroupDraft;
  readonly state: {
    readonly isDirty: boolean;
    readonly isSaving: boolean;
    readonly isSettingsOpen: boolean;
    readonly isVisibilityPending: boolean;
  };
  readonly variant: "editor" | "viewer";
  readonly saveError: string | null;
  readonly visibility: "private" | "global";
  readonly role: "owner" | "editor" | "viewer";
  readonly isSaveConflict: boolean;
  readonly onReloadLatest: () => void;
  readonly onNameChange: (name: string) => void;
  readonly onSave: () => void;
  readonly onSettingsToggle: () => void;
  readonly onVisibilityChange: (visibility: "private" | "global") => void;
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
  state,
  variant,
  onNameChange,
  onSave,
  onSettingsToggle,
  onVisibilityChange,
  role,
  isSaveConflict,
  onReloadLatest,
  saveError,
  visibility,
}: SquadEditorCommandHeaderProps) => {
  const { isDirty, isSaving, isSettingsOpen, isVisibilityPending } = state;
  const isViewer = variant === "viewer";

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
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
                  className="h-10 max-w-xl border-transparent bg-transparent px-3 py-2 font-sans font-semibold text-xl leading-6 shadow-none focus-visible:border-input"
                  disabled={isSaving}
                  id="group-name"
                  maxLength={80}
                  onChange={(event) => {
                    onNameChange(event.target.value);
                  }}
                  value={draft.name}
                />
              </h1>
            </>
          )}
        </div>
        <div className="flex w-full flex-wrap items-start justify-end gap-3 sm:w-auto">
          {role === "owner" && (
            <div className="flex items-center gap-2">
              <Label
                className="text-muted-foreground text-xs"
                htmlFor="group-visibility-toggle"
              >
                Publiczna
              </Label>
              <Switch
                checked={visibility === "global"}
                disabled={isSaving || isVisibilityPending}
                id="group-visibility-toggle"
                onCheckedChange={(checked) => {
                  onVisibilityChange(checked ? "global" : "private");
                }}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={role === "viewer" ? "secondary" : "primary-light"}>
              {roleLabels[role]}
            </Badge>
            <Badge variant={visibility === "global" ? "info-light" : "outline"}>
              {visibility === "global" ? "publiczna" : "prywatna"}
            </Badge>
          </div>
          {!isViewer && (
            <div className="flex items-start gap-1">
              {role === "owner" && (
                <Button
                  aria-controls="squad-group-settings-panel"
                  aria-expanded={isSettingsOpen}
                  onClick={onSettingsToggle}
                  type="button"
                  variant={isSettingsOpen ? "secondary" : "outline"}
                >
                  <Settings className="size-4" />
                  Ustawienia
                </Button>
              )}
              <div className="flex flex-col items-center gap-1">
                <Button
                  disabled={
                    isSaving || !isDirty || draft.name.trim().length === 0
                  }
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
                <span
                  aria-live="polite"
                  className="text-muted-foreground text-xs"
                >
                  {getSaveStatus(isViewer, isSaving, isDirty)}
                </span>
              </div>
            </div>
          )}
          {isViewer && (
            <span aria-live="polite" className="text-muted-foreground text-xs">
              {getSaveStatus(isViewer, isSaving, isDirty)}
            </span>
          )}
        </div>
      </div>
      {saveError !== null && (
        <Alert variant="destructive">
          <AlertTitle>Nie udało się zapisać zmian</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
          {isSaveConflict && (
            <AlertAction>
              <Button
                onClick={onReloadLatest}
                size="sm"
                type="button"
                variant="outline"
              >
                Wczytaj najnowszą wersję
              </Button>
            </AlertAction>
          )}
        </Alert>
      )}
    </header>
  );
};
